// // // import { chromium } from 'playwright';
// // // import path from 'node:path';

// // // export type WishlistBookRaw = {
// // //   title: string | null;
// // //   author: string | null;
// // //   listPriceText: string | null;
// // //   discountedPriceText: string | null;
// // //   discountPercentText: string | null;
// // //   currency: string;
// // // };

// // // export async function scrapeWishlist(url: string): Promise<WishlistBookRaw[]> {
// // //   const userDataDir = path.resolve('./playwright-user-data');

// // //   const context = await chromium.launchPersistentContext(userDataDir, {
// // //     headless: false,
// // //     viewport: { width: 1400, height: 900 },
// // //     args: ['--start-maximized'],
// // //   });

// // //   const page = context.pages()[0] || (await context.newPage());

// // //   try {
// // //     await page.goto(url, {
// // //       waitUntil: 'domcontentloaded',
// // //       timeout: 60_000,
// // //     });

// // //     console.log('Título inicial:', await page.title());

// // //     const currentTitle = await page.title();

// // //     if (/human verification|verify|verificación/i.test(currentTitle)) {
// // //       console.log('\nSe detectó una verificación humana.');
// // //       console.log('Resuélvela manualmente en la ventana del navegador.');
// // //       console.log('Cuando termines y veas la wishlist cargada, presiona ENTER aquí.\n');
// // //       await waitForEnter();
// // //     }

// // //     await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {
// // //       console.log('No se alcanzó networkidle, continúo de todos modos...');
// // //     });

// // //     console.log('Título final:', await page.title());

// // //     // Espera un poco extra por si la lista termina de renderizar
// // //     await page.waitForTimeout(3000);

// // //     // Detectar contenedores candidatos
// // //     const candidateLocators = [
// // //       'article',
// // //       'li',
// // //       '.producto',
// // //       '.book',
// // //       '.item',
// // //       '.product',
// // //       '[class*="product"]',
// // //       '[class*="book"]',
// // //       '[class*="item"]',
// // //       '[class*="card"]',
// // //     ];

// // //     let extracted: WishlistBookRaw[] = [];

// // //     for (const selector of candidateLocators) {
// // //       const items = page.locator(selector);
// // //       const count = await items.count();

// // //       if (!count) continue;

// // //       const batch = await items.evaluateAll((nodes) => {
// // //         const results: {
// // //           title: string | null;
// // //           author: string | null;
// // //           listPriceText: string | null;
// // //           discountedPriceText: string | null;
// // //           discountPercentText: string | null;
// // //           currency: string;
// // //           rawText: string;
// // //         }[] = [];

// // //         for (const node of nodes) {
// // //           const rawText = (node.textContent || '').replace(/\s+/g, ' ').trim();

// // //           // Heurística mínima: debe tener "Comprar" y al menos un precio
// // //           const hasComprar = /comprar/i.test(rawText);
// // //           const hasPrice = /\$\s*[\d.,]+/.test(rawText);

// // //           if (!hasComprar || !hasPrice) continue;

// // //           const lines = rawText
// // //             .split(/(?<=\))\s+|(?<=Nuevo)\s+|(?<=Usado)\s+|(?<=Comprar)\s+|(?<=ver más)\s+/i)
// // //             .map((x) => x.trim())
// // //             .filter(Boolean);

// // //           const prices = rawText.match(/\$\s*[\d.,]+/g) || [];
// // //           const discountMatch = rawText.match(/-\s*\d+\s*%|descuento\s*\d+\s*%|\d+\s*%/i);

// // //           // Título: primera línea no vacía que no sea descuento/precio/opiniones
// // //           let title: string | null = null;
// // //           for (const line of lines) {
// // //             if (
// // //               !/\$\s*[\d.,]+/.test(line) &&
// // //               !/^\(?\d+\s+opiniones\)?$/i.test(line) &&
// // //               !/%/.test(line) &&
// // //               !/^comprar$/i.test(line) &&
// // //               !/^ahorras/i.test(line) &&
// // //               line.length > 5
// // //             ) {
// // //               title = line;
// // //               break;
// // //             }
// // //           }

// // //           // Autor: línea siguiente al título que parezca nombre
// // //           let author: string | null = null;
// // //           if (title) {
// // //             const titleIndex = lines.findIndex((x) => x === title);
// // //             if (titleIndex >= 0 && lines[titleIndex + 1]) {
// // //               const possibleAuthor = lines[titleIndex + 1];
// // //               if (
// // //                 !/\$\s*[\d.,]+/.test(possibleAuthor) &&
// // //                 !/%/.test(possibleAuthor) &&
// // //                 !/^comprar$/i.test(possibleAuthor) &&
// // //                 !/^ahorras/i.test(possibleAuthor)
// // //               ) {
// // //                 author = possibleAuthor;
// // //               }
// // //             }
// // //           }

// // //           results.push({
// // //             title,
// // //             author,
// // //             discountedPriceText: prices[0] || null,
// // //             listPriceText: prices[1] || null,
// // //             discountPercentText: discountMatch ? discountMatch[0].replace(/\s+/g, ' ').trim() : null,
// // //             currency: 'MXN',
// // //             rawText,
// // //           });
// // //         }

// // //         return results;
// // //       });

// // //       const cleaned = batch
// // //         .filter((item) => item.title && item.discountedPriceText)
// // //         .map(({ rawText, ...rest }) => rest);

// // //       if (cleaned.length > extracted.length) {
// // //         extracted = cleaned;
// // //       }
// // //     }

// // //     // Eliminar duplicados por título + precio descuento
// // //     const unique = extracted.filter((item, index, arr) => {
// // //       return (
// // //         index ===
// // //         arr.findIndex(
// // //           (x) =>
// // //             x.title === item.title &&
// // //             x.discountedPriceText === item.discountedPriceText &&
// // //             x.listPriceText === item.listPriceText
// // //         )
// // //       );
// // //     });

// // //     console.log('\nLibros detectados:', unique.length);
// // //     console.dir(unique.slice(0, 10), { depth: null });

// // //     return unique;
// // //   } finally {
// // //     await context.close();
// // //   }
// // // }

// // // function waitForEnter(): Promise<void> {
// // //   return new Promise((resolve) => {
// // //     process.stdin.resume();
// // //     process.stdin.setEncoding('utf8');
// // //     process.stdin.once('data', () => resolve());
// // //   });
// // // }









// // import { chromium } from 'playwright';
// // import path from 'node:path';

// // export async function scrapeWishlist(url: string): Promise<unknown[]> {
// //   const userDataDir = path.resolve('./playwright-user-data');

// //   const context = await chromium.launchPersistentContext(userDataDir, {
// //     headless: false,
// //     viewport: { width: 1400, height: 900 },
// //     args: ['--start-maximized'],
// //   });

// //   const page = context.pages()[0] || (await context.newPage());

// //   try {
// //     await page.goto(url, {
// //       waitUntil: 'domcontentloaded',
// //       timeout: 60_000,
// //     });

// //     console.log('Título inicial:', await page.title());

// //     const currentTitle = await page.title();

// //     if (/human verification|verify|verificación/i.test(currentTitle)) {
// //       console.log('\nSe detectó una verificación humana.');
// //       console.log('Resuélvela manualmente en la ventana del navegador.');
// //       console.log('Cuando termines y veas la wishlist cargada, presiona ENTER aquí.\n');
// //       await waitForEnter();
// //     }

// //     await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {
// //       console.log('No se alcanzó networkidle, continúo...');
// //     });

// //     await page.waitForTimeout(3000);

// //     const selectors = [
// //       'article',
// //       'li',
// //       '.product',
// //       '.producto',
// //       '.item',
// //       '.book',
// //       '[class*="product"]',
// //       '[class*="producto"]',
// //       '[class*="item"]',
// //       '[class*="book"]',
// //       '[class*="card"]',
// //     ];

// //     for (const selector of selectors) {
// //       const count = await page.locator(selector).count();
// //       console.log(`Selector ${selector}: ${count}`);
// //     }

// //     const candidates = page.locator('article, li, .product, .producto, .item, .book, [class*="card"]');
// //     const count = await candidates.count();

// //     console.log('\n=== MUESTRA DE NODOS ===\n');

// //     const sampleSize = Math.min(count, 8);

// //     for (let i = 0; i < sampleSize; i++) {
// //       const node = candidates.nth(i);

// //       const text = (await node.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
// //       const html = await node.innerHTML().catch(() => '');

// //       if (!/\$\s*[\d.,]+/.test(text) || !/comprar/i.test(text)) continue;

// //       console.log(`\n----- CANDIDATO ${i} -----`);
// //       console.log('TEXT:');
// //       console.log(text.slice(0, 1200));
// //       console.log('\nHTML:');
// //       console.log(html.slice(0, 2500));
// //       console.log('\n-------------------------\n');
// //     }

// //     return [];
// //   } finally {
// //     await context.close();
// //   }
// // }

// // function waitForEnter(): Promise<void> {
// //   return new Promise((resolve) => {
// //     process.stdin.resume();
// //     process.stdin.setEncoding('utf8');
// //     process.stdin.once('data', () => resolve());
// //   });
// // }







// import { chromium } from 'playwright';
// import path from 'node:path';

// export async function scrapeWishlist(url: string): Promise<unknown[]> {
//   const userDataDir = path.resolve('./playwright-user-data');

//   const context = await chromium.launchPersistentContext(userDataDir, {
//     headless: false,
//     viewport: { width: 1400, height: 900 },
//     args: ['--start-maximized'],
//   });

//   const page = context.pages()[0] || (await context.newPage());

//   try {
//     await page.goto(url, {
//       waitUntil: 'domcontentloaded',
//       timeout: 60_000,
//     });

//     console.log('Título inicial:', await page.title());

//     const currentTitle = await page.title();

//     if (/human verification|verify|verificación/i.test(currentTitle)) {
//       console.log('\nSe detectó una verificación humana.');
//       console.log('Resuélvela manualmente en la ventana del navegador.');
//       console.log('Cuando termines y veas la wishlist cargada, presiona ENTER aquí.\n');
//       await waitForEnter();
//     }

//     await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {
//       console.log('No se alcanzó networkidle, continúo...');
//     });

//     await page.waitForTimeout(3000);

//     const items = page.locator('.producto');
//     const count = await items.count();

//     console.log(`Tarjetas .producto detectadas: ${count}`);

//     const sampleSize = Math.min(count, 3);

//     for (let i = 0; i < sampleSize; i++) {
//       const node = items.nth(i);

//       const text = await node.innerText().catch(() => '');
//       const html = await node.innerHTML().catch(() => '');

//       console.log(`\n===== PRODUCTO ${i} =====\n`);
//       console.log('TEXT:\n');
//       console.log(text.slice(0, 2000));

//       console.log('\nHTML:\n');
//       console.log(html.slice(0, 5000));

//       const descendants = await node.locator('*').evaluateAll((elements) => {
//         return elements
//           .map((el) => {
//             const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
//             const className =
//               typeof el.className === 'string'
//                 ? el.className
//                 : (el.getAttribute('class') ?? '');
//             const tag = el.tagName.toLowerCase();

//             return {
//               tag,
//               className,
//               text,
//             };
//           })
//           .filter((x) => x.text.length > 0)
//           .slice(0, 40);
//       });

//       console.log('\nDESCENDANTS:\n');
//       console.dir(descendants, { depth: null });
//       console.log('\n=========================\n');
//     }

//     return [];
//   } finally {
//     await context.close();
//   }
// }

// function waitForEnter(): Promise<void> {
//   return new Promise((resolve) => {
//     process.stdin.resume();
//     process.stdin.setEncoding('utf8');
//     process.stdin.once('data', () => resolve());
//   });
// }


import { chromium } from 'playwright';
import path from 'node:path';

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

    const items = page.locator('.producto');
    const count = await items.count();

    console.log(`Tarjetas .producto detectadas: ${count}`);

    const results: WishlistBookRaw[] = [];

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);

      const title = await textOrNull(item.locator('.infoProducto .titulo').first());
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

      if (!title || !discountedPriceText) {
        continue;
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

    const unique = dedupeBooks(results);

    console.log('\nLibros detectados:', unique.length);
    console.dir(unique.slice(0, 10), { depth: null });

    return unique;
  } finally {
    await context.close();
  }
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
