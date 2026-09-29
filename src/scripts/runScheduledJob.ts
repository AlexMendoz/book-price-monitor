import { formatMoney, formatSignedMoney, formatPercent, escapeHtml } from '../utils/format.cjs';
import { formatDealLines } from '../services/dealPresentation';
import { randomUUID } from 'node:crypto';
import '../config/loadEnv';
import { WISHLISTS } from '../config/wishlists';
import { scrapeWishlist } from '../scraper/wishlistScraper';
import { collectWishlists } from '../services/wishlistSyncService';
import { parseDiscount, parseMoney } from '../utils/money';
import { markBooksOutsideCurrentWishlistsInactive, upsertBook } from '../services/bookService';
import { createPriceSnapshot } from '../services/priceSnapshotService';
import { upsertWishlist, linkBookToWishlist, reconcileWishlist, retireUnconfiguredWishlists } from '../services/wishlistService';
import { getAllWishlists } from '../services/reportService';
import { getDealRankingByWishlist } from '../services/rankingService';
import { sendTelegramMessage } from '../services/telegramService';

async function main() {
  const runId = randomUUID();
  const scraperOptions = {
    headless: readBooleanEnv('SCRAPER_HEADLESS', true),
    allowManualVerification: readBooleanEnv('SCRAPER_ALLOW_MANUAL_VERIFICATION', false),
    userDataDir: process.env.PLAYWRIGHT_USER_DATA_DIR || './playwright-user-data-job',
    waitAfterLoadMs: readNumberEnv('SCRAPER_WAIT_AFTER_LOAD_MS', 3000),
  };

  let totalBooksProcessed = 0;
  const activeBookIds = new Set<number>();
  const wishlistIds: number[] = [];

  const collected = await collectWishlists(WISHLISTS, scraperOptions);
  for (const wishlist of collected) {
    const wishlistId = await upsertWishlist({
      name: wishlist.name,
      url: wishlist.url,
    });

    wishlistIds.push(wishlistId);
    const wishlistBookIds: number[] = [];
    const books = wishlist.books;

    console.log(`Procesando ${books.length} libros para wishlist: ${wishlist.name}`);
    totalBooksProcessed += books.length;

    for (const book of books) {
      if (!book.title) continue;

      const bookId = await upsertBook({
        title: book.title,
        author: book.author,
        productUrl: book.productUrl,
        imageUrl: book.imageUrl,
      });

      activeBookIds.add(bookId);
      wishlistBookIds.push(bookId);
      await linkBookToWishlist(wishlistId, bookId);

      await createPriceSnapshot({
        bookId,
        runId,
        listPrice: parseMoney(book.listPriceText),
        discountedPrice: parseMoney(book.discountedPriceText),
        discountPercent: parseDiscount(book.discountPercentText),
        currency: book.currency,
      });
    }
    await reconcileWishlist(wishlistId, wishlistBookIds);
  }
  await retireUnconfiguredWishlists(wishlistIds);

  if (totalBooksProcessed === 0) {
    throw new Error(
      'No se pudo extraer ningún libro de las wishlists. Revisa bloqueo/403 de Buscalibre y tu configuración.'
    );
  }

  await markBooksOutsideCurrentWishlistsInactive([...activeBookIds]);

  const allWishlists = await getAllWishlists();
  const lines: string[] = [];
  lines.push('<b>📚 Ofertas detectadas por wishlist</b>');
  lines.push('');

  let sectionsWithDeals = 0;

  for (const wishlist of allWishlists) {
    const ranking = await getDealRankingByWishlist(wishlist.id);

    const interestingDeals = ranking.filter((item) =>
      item.isHistoricalLow ||
      (item.dropVsPrevious ?? 0) > 0 ||
      item.hasHighDiscount
    );

    if (interestingDeals.length === 0) {
      continue;
    }

    sectionsWithDeals += 1;
    lines.push(`<b>Wishlist: ${escapeHtml(wishlist.name)}</b>`);
    lines.push('');

    for (const item of interestingDeals.slice(0, 5)) {
    lines.push(...formatDealLines(item), '');
  }
  }

  if (sectionsWithDeals === 0) {
    console.log('No hay ofertas relevantes para notificar.');
    return;
  }

  await sendTelegramMessage({
    text: lines.join('\n').trim(),
  });

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('Job completado y notificación enviada.');
    return;
  }

  console.log('Job completado. Telegram no está configurado, no se envió notificación.');
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];

  if (raw === undefined) {
    return defaultValue;
  }

  return /^(1|true|yes|on)$/i.test(raw);
}

function readNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : defaultValue;
}

main().catch((error) => {
  console.error('Error en job programado:', error);
  process.exit(1);
});
