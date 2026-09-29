import type { WishlistConfig } from '../config/wishlists';
import { scrapeWishlist, type ScrapeWishlistOptions, type WishlistBookRaw } from '../scraper/wishlistScraper';

export type CollectedWishlist = WishlistConfig & { books: WishlistBookRaw[] };

export async function collectWishlists(
  wishlists: WishlistConfig[],
  options: ScrapeWishlistOptions = {},
  scrape: typeof scrapeWishlist = scrapeWishlist
): Promise<CollectedWishlist[]> {
  if (!wishlists.length) throw new Error('No hay wishlists configuradas.');
  const collected: CollectedWishlist[] = [];
  for (const wishlist of wishlists) {
    const books = await scrape(wishlist.url, options);
    if (!books.length || books.some((book) => !book.title || !book.discountedPriceText)) {
      throw new Error(`Extraccion vacia o incompleta: ${wishlist.name}. No se actualizaran estados ni precios.`);
    }
    collected.push({ ...wishlist, books });
  }
  return collected;
}
