import { restorePublishedHistory } from './historyArchiveService';
import { activeBookCondition, activeMembershipCondition } from './activity';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { books, priceSnapshots, wishlistBooks, wishlists } from '../db/schema';




export async function getAllBooks() {
  return db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      productUrl: books.productUrl,
      imageUrl: books.imageUrl,
    })
    .from(books)
    .orderBy(asc(books.title));
}

export async function getBookPriceHistory(bookId: number) {
  await restorePublishedHistory();
  return db
    .select({
      bookId: books.id,
      title: books.title,
      author: books.author,
      currency: priceSnapshots.currency,
      listPrice: priceSnapshots.listPrice,
      discountedPrice: priceSnapshots.discountedPrice,
      discountPercent: priceSnapshots.discountPercent,
      scrapedAt: priceSnapshots.scrapedAt,
      timePrecision: priceSnapshots.timePrecision,
    })
    .from(priceSnapshots)
    .innerJoin(books, eq(books.id, priceSnapshots.bookId))
    .where(eq(priceSnapshots.bookId, bookId))
    .orderBy(asc(priceSnapshots.scrapedAt), asc(priceSnapshots.id));
}

export async function getAllBooksPriceHistory() {
  await restorePublishedHistory();
  return db
    .select({
      bookId: books.id,
      title: books.title,
      author: books.author,
      productUrl: books.productUrl,
      imageUrl: books.imageUrl,
      isActive: sql<boolean>`CASE WHEN ${activeBookCondition()} THEN 1 ELSE 0 END`.mapWith(Boolean),
      currency: priceSnapshots.currency,
      listPrice: priceSnapshots.listPrice,
      discountedPrice: priceSnapshots.discountedPrice,
      discountPercent: priceSnapshots.discountPercent,
      scrapedAt: priceSnapshots.scrapedAt,
      timePrecision: priceSnapshots.timePrecision,
    })
    .from(priceSnapshots)
    .innerJoin(books, eq(books.id, priceSnapshots.bookId))
    .orderBy(asc(books.title), asc(priceSnapshots.scrapedAt), asc(priceSnapshots.id));
}

export async function getAllWishlists() {
  return db
    .select({
      id: wishlists.id,
      name: wishlists.name,
      url: wishlists.url,
    })
    .from(wishlists)
    .where(eq(wishlists.isActive, true))
    .orderBy(asc(wishlists.name));
}


export async function getWishlistBooks(wishlistId: number) {
  return db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
    })
    .from(wishlistBooks)
    .innerJoin(books, eq(books.id, wishlistBooks.bookId))
    .innerJoin(wishlists, eq(wishlists.id, wishlistBooks.wishlistId))
    .where(and(eq(wishlistBooks.wishlistId, wishlistId), activeMembershipCondition()))
    .orderBy(asc(books.title));
}
