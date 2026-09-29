import { randomUUID } from 'node:crypto';
import { sqlite } from '../db/client';
import { restorePublishedHistory } from './historyArchiveService';
import { upsertBook, markBooksOutsideCurrentWishlistsInactive } from './bookService';
import { createPriceSnapshot } from './priceSnapshotService';
import { upsertWishlist, linkBookToWishlist, reconcileWishlist, retireUnconfiguredWishlists } from './wishlistService';
import { parseMoney, parseDiscount } from '../utils/money';
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

export async function syncWishlists(wishlists: WishlistConfig[], options: ScrapeWishlistOptions = {}, scrape: typeof scrapeWishlist = scrapeWishlist) {
  const collected = await collectWishlists(wishlists, options, scrape);
  await restorePublishedHistory();
  const runId = randomUUID();
  const activeBookIds = new Set<number>();
  const wishlistIds: number[] = [];
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    for (const wishlist of collected) {
      const wishlistId = await upsertWishlist(wishlist);
      wishlistIds.push(wishlistId);
      const memberIds: number[] = [];
      for (const raw of wishlist.books) {
        const bookId = await upsertBook({ title: raw.title!, author: raw.author, productUrl: raw.productUrl, imageUrl: raw.imageUrl });
        memberIds.push(bookId);
        await linkBookToWishlist(wishlistId, bookId);
        if (activeBookIds.has(bookId)) continue;
        activeBookIds.add(bookId);
        await createPriceSnapshot({ bookId, runId, listPrice: parseMoney(raw.listPriceText),
          discountedPrice: parseMoney(raw.discountedPriceText), discountPercent: parseDiscount(raw.discountPercentText), currency: raw.currency });
      }
      await reconcileWishlist(wishlistId, memberIds);
    }
    await retireUnconfiguredWishlists(wishlistIds);
    await markBooksOutsideCurrentWishlistsInactive([...activeBookIds]);
    sqlite.exec('COMMIT');
    return { runId, booksProcessed: activeBookIds.size, wishlistsProcessed: wishlistIds.length };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}
