import { asc, eq } from 'drizzle-orm';
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
    })
    .from(priceSnapshots)
    .innerJoin(books, eq(books.id, priceSnapshots.bookId))
    .where(eq(priceSnapshots.bookId, bookId))
    .orderBy(asc(priceSnapshots.scrapedAt), asc(priceSnapshots.id));
}

export async function getAllBooksPriceHistory() {
  return db
    .select({
      bookId: books.id,
      title: books.title,
      author: books.author,
      productUrl: books.productUrl,
      imageUrl: books.imageUrl,
      isActive: books.isActive,
      currency: priceSnapshots.currency,
      listPrice: priceSnapshots.listPrice,
      discountedPrice: priceSnapshots.discountedPrice,
      discountPercent: priceSnapshots.discountPercent,
      scrapedAt: priceSnapshots.scrapedAt,
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
    .where(eq(wishlistBooks.wishlistId, wishlistId))
    .orderBy(asc(books.title));
}
