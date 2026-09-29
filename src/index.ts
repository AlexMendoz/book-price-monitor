import { randomUUID } from 'node:crypto';
import './config/loadEnv';
import { scrapeWishlist } from './scraper/wishlistScraper';
import { collectWishlists } from './services/wishlistSyncService';
import { parseDiscount, parseMoney } from './utils/money';
import { markBooksOutsideCurrentWishlistsInactive, upsertBook } from './services/bookService';
import { createPriceSnapshot } from './services/priceSnapshotService';
import { analyzeDeal } from './services/dealAnalyzer';

import { WISHLISTS } from './config/wishlists';
import { upsertWishlist, linkBookToWishlist, reconcileWishlist, retireUnconfiguredWishlists } from './services/wishlistService';

async function main() {
  const runId = randomUUID();
  if (WISHLISTS.length === 0) {
    throw new Error('No hay wishlists configuradas. Define WISHLISTS_JSON en tu .env.local');
  }

  const activeBookIds = new Set<number>();
  const wishlistIds: number[] = [];

  const collected = await collectWishlists(WISHLISTS);
  for (const wishlist of collected) {
    const wishlistId = await upsertWishlist({
      name: wishlist.name,
      url: wishlist.url,
    });

    wishlistIds.push(wishlistId);
    const wishlistBookIds: number[] = [];
    const books = wishlist.books;
    console.log(`\nProcesando ${books.length} libros de "${wishlist.name}"...\n`);

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
      await analyzeDeal({
        bookId,
        currentListPrice: parseMoney(book.listPriceText),
        currentDiscountedPrice: parseMoney(book.discountedPriceText),
        currentDiscountPercent: parseDiscount(book.discountPercentText),
      });

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

  await markBooksOutsideCurrentWishlistsInactive([...activeBookIds]);

  console.log('\nProceso terminado.');
}

main().catch((error) => {
  console.error('Error al ejecutar el scraper:', error);
  process.exit(1);
});
