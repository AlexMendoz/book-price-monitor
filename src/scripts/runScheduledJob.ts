import 'dotenv/config';
import { WISHLISTS } from '../config/wishlists';
import { scrapeWishlist } from '../scraper/wishlistScraper';
import { parseDiscount, parseMoney } from '../utils/money';
import { upsertBook } from '../services/bookService';
import { createPriceSnapshot } from '../services/priceSnapshotService';
import { upsertWishlist, linkBookToWishlist } from '../services/wishlistService';
import { getAllWishlists } from '../services/reportService';
import { getDealRankingByWishlist } from '../services/rankingService';
import { sendTelegramMessage } from '../services/telegramService';

async function main() {
  const scraperOptions = {
    headless: readBooleanEnv('SCRAPER_HEADLESS', true),
    allowManualVerification: readBooleanEnv('SCRAPER_ALLOW_MANUAL_VERIFICATION', false),
    userDataDir: process.env.PLAYWRIGHT_USER_DATA_DIR || './playwright-user-data-job',
    waitAfterLoadMs: readNumberEnv('SCRAPER_WAIT_AFTER_LOAD_MS', 3000),
  };

  for (const wishlist of WISHLISTS) {
    const wishlistId = await upsertWishlist({
      name: wishlist.name,
      url: wishlist.url,
    });

    const books = await scrapeWishlist(wishlist.url, scraperOptions);

    console.log(`Procesando ${books.length} libros para wishlist: ${wishlist.name}`);

    for (const book of books) {
      if (!book.title) continue;

      const bookId = await upsertBook({
        title: book.title,
        author: book.author,
        productUrl: book.productUrl,
        imageUrl: book.imageUrl,
      });

      await linkBookToWishlist(wishlistId, bookId);

      await createPriceSnapshot({
        bookId,
        listPrice: parseMoney(book.listPriceText),
        discountedPrice: parseMoney(book.discountedPriceText),
        discountPercent: parseDiscount(book.discountPercentText),
        currency: book.currency,
      });
    }
  }

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
      const badges: string[] = [];

      if (item.isHistoricalLow) badges.push('🏆 mínimo histórico');
      if ((item.dropVsPrevious ?? 0) > 0) badges.push('⬇️ bajó');
      if (item.hasHighDiscount) badges.push('🔥 descuento alto');
      if (item.looksLikeInflatedBasePrice) badges.push('⚠️ sospechoso');

      lines.push(`<b>${escapeHtml(item.title)}</b>`);
      lines.push(`Actual: ${formatMoney(item.currentDiscountedPrice, item.currency)} | Lista: ${formatMoney(item.currentListPrice, item.currency)}`);
      lines.push(`Descuento: ${formatPercent(item.currentDiscountPercent)} | Score: ${item.dealScore.toFixed(2)}`);

      if (item.previousDiscountedPrice !== null) {
        lines.push(`Anterior: ${formatMoney(item.previousDiscountedPrice, item.currency)} | Cambio: ${formatSignedMoney(item.dropVsPrevious, item.currency)}`);
      }

      if (badges.length > 0) {
        lines.push(`Indicadores: ${badges.join(' · ')}`);
      }

      if (item.productUrl) {
        lines.push(escapeHtml(item.productUrl));
      }

      lines.push('');
    }
  }

  if (sectionsWithDeals === 0) {
    console.log('No hay ofertas relevantes para notificar.');
    return;
  }

  await sendTelegramMessage({
    text: lines.join('\n').trim(),
  });

  console.log('Job completado y notificación enviada.');
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null) return 'N/D';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedMoney(value: number | null, currency: string): string {
  if (value === null) return 'N/D';

  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return value > 0 ? `-${formatted}` : value < 0 ? `+${formatted}` : formatted;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/D';
  return `${value.toFixed(2)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
