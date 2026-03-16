import 'dotenv/config';
import { scrapeWishlist } from './scraper/wishlistScraper';
import { parseDiscount, parseMoney } from './utils/money';
import { upsertBook } from './services/bookService';
import { createPriceSnapshot } from './services/priceSnapshotService';
import { analyzeDeal } from './services/dealAnalyzer';

import { WISHLISTS } from './config/wishlists';
import { upsertWishlist, linkBookToWishlist } from './services/wishlistService';

async function main() {
  if (WISHLISTS.length === 0) {
    throw new Error('No hay wishlists configuradas en src/config/wishlist.ts');
  }

  for (const wishlist of WISHLISTS) {
    const wishlistId = await upsertWishlist({
      name: wishlist.name,
      url: wishlist.url,
    });

    const books = await scrapeWishlist(wishlist.url);
    console.log(`\nProcesando ${books.length} libros de "${wishlist.name}"...\n`);

    for (const book of books) {
      if (!book.title) continue;

      const bookId = await upsertBook({
        title: book.title,
        author: book.author,
        productUrl: book.productUrl,
        imageUrl: book.imageUrl,
      });

      await linkBookToWishlist(wishlistId, bookId);
      await analyzeDeal({
        bookId,
        currentListPrice: parseMoney(book.listPriceText),
        currentDiscountedPrice: parseMoney(book.discountedPriceText),
        currentDiscountPercent: parseDiscount(book.discountPercentText),
      });

      await createPriceSnapshot({
        bookId,
        listPrice: parseMoney(book.listPriceText),
        discountedPrice: parseMoney(book.discountedPriceText),
        discountPercent: parseDiscount(book.discountPercentText),
        currency: book.currency,
      });
    }
  }

  console.log('\nProceso terminado.');
}

main().catch((error) => {
  console.error('Error al ejecutar el scraper:', error);
  process.exit(1);
});
