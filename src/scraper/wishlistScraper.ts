import { chromium } from 'playwright';
import path from 'node:path';
import { parseMoney } from '../utils/money';

export type WishlistBookRaw = {
  title: string | null;
  author: string | null;
  listPriceText: string | null;
  discountedPriceText: string | null;
  discountPercentText: string | null;
  currency: string;
  productUrl: string | null;
  imageUrl: string | null;
};

export type WishlistScrapeResult = {
  wishlistName: string;
  sourceUrl: string;
  books: WishlistBookRaw[];
};

export type ScrapeWishlistOptions = {
  headless?: boolean;
  allowManualVerification?: boolean;
  userDataDir?: string;
  waitAfterLoadMs?: number;
};

export async function scrapeWishlist(
  url: string,
  options: ScrapeWishlistOptions = {}
): Promise<WishlistBookRaw[]> {
  const {
    headless = false,
    allowManualVerification = true,
    userDataDir = './playwright-user-data',
    waitAfterLoadMs = 3000,
  } = options;
  const resolvedUserDataDir = path.resolve(userDataDir);

  const context = await chromium.launchPersistentContext(resolvedUserDataDir, {
    headless,
    viewport: { width: 1400, height: 900 },
    args: headless ? [] : ['--start-maximized'],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const currentTitle = await page.title();
    console.log('Título inicial:', currentTitle);

    if (/403|forbidden/i.test(currentTitle)) {
      throw new Error(
        `Buscalibre bloqueó el acceso a la wishlist (${currentTitle}). ` +
          'Intenta cambiar red/IP, limpiar playwright-user-data y reintentar.'
      );
    }

    if (/human verification|verify|verificación/i.test(currentTitle)) {
      if (!allowManualVerification) {
        throw new Error(
          'Se detectó una verificación humana y el scraper está en modo no interactivo.'
        );
      }

      console.log('\nSe detectó una verificación humana.');
      console.log('Resuélvela manualmente en la ventana del navegador.');
      console.log('Cuando termines y veas la wishlist cargada, presiona ENTER aquí.\n');
      await waitForEnter();
    }

    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {
      console.log('No se alcanzó networkidle, continúo...');
    });

    await page.waitForTimeout(waitAfterLoadMs);

    return await extractWishlistBooks(page);
  } finally {
    await context.close();
  }
}

export async function extractWishlistBooks(page: import('playwright').Page): Promise<WishlistBookRaw[]> {
  const items = page.locator('.producto');
  const count = await items.count();

  console.log(`Tarjetas .producto detectadas: ${count}`);

  const results: WishlistBookRaw[] = [];
  const unidentified: number[] = [];

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);

    const title = await textOrNull(item.locator('.infoProducto .titulo').first())
      ?? await attrOrNull(item.locator('.infoProducto .titulo a, .portadaProducto a').first(), 'title');
    const detailNodes = item.locator('.infoProducto .detalles');
    const detailCount = await detailNodes.count();

    let author: string | null = null;

    // En tu HTML:
    // detalles[0] = opiniones
    // detalles[1] = autor
    // detalles[2] = editorial/formato/estado
    for (let j = 0; j < detailCount; j++) {
      const detailText = await textOrNull(detailNodes.nth(j));

      if (!detailText) continue;
      if (/opiniones/i.test(detailText)) continue;
      if (/editorial/i.test(detailText)) continue;
      if (/nuevo|usado|tapa/i.test(detailText)) continue;

      author = detailText;
      break;
    }

    const discountedPriceText = await textOrNull(
      item.locator('.marcoPrecios .precioAhora').first()
    );

    const listPriceText = await textOrNull(
      item.locator('.marcoPrecios .precioTachado').first()
    );

    const rawDiscountText = await textOrNull(
      item.locator('.portadaProducto .marcoDcto .dcto').first()
    );

    const discountPercentText =
      rawDiscountText && /%/.test(rawDiscountText) ? rawDiscountText : null;

    const productUrl = await attrOrNull(
      item.locator('.portadaProducto a[href], .infoProducto .titulo a[href]').first(),
      'href'
    );

    const imageUrl = await attrOrNull(
      item.locator('.portadaProducto img').first(),
      'src'
    );

    if (!title) {
      unidentified.push(i + 1);
      continue;
    }

    if (parseMoney(discountedPriceText) === null) {
      console.warn(`Libro sin precio disponible: ${title}. Se conserva su membresia e historial.`);
    }

    results.push({
      title,
      author,
      discountedPriceText,
      listPriceText,
      discountPercentText,
      currency: 'MXN',
      productUrl,
      imageUrl,
    });
  }

  if (count === 0 || results.length !== count) {
    throw new Error(`Extraccion incompleta: ${results.length} de ${count} tarjetas identificadas. Tarjetas sin titulo: ${unidentified.join(', ') || 'ninguna; lista vacia'}. Se conserva el estado anterior.`);
  }
  const unique = dedupeBooks(results);

  console.log('\nLibros detectados:', unique.length);
  console.dir(unique.slice(0, 10), { depth: null });

  return unique;
}

async function textOrNull(locator: import('playwright').Locator): Promise<string | null> {
  const count = await locator.count();
  if (!count) return null;

  const text = await locator.innerText().catch(() => '');
  const cleaned = text.replace(/\s+/g, ' ').trim();

  return cleaned || null;
}

async function attrOrNull(
  locator: import('playwright').Locator,
  attr: string
): Promise<string | null> {
  const count = await locator.count();
  if (!count) return null;

  const value = await locator.getAttribute(attr).catch(() => null);
  return value?.trim() || null;
}

function dedupeBooks(items: WishlistBookRaw[]): WishlistBookRaw[] {
  return items.filter((item, index, arr) => {
    return (
      index ===
      arr.findIndex(
        (x) =>
          x.productUrl === item.productUrl &&
          x.title === item.title &&
          x.author === item.author &&
          x.discountedPriceText === item.discountedPriceText &&
          x.listPriceText === item.listPriceText
      )
    );
  });
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => resolve());
  });
}
