import { calculateDealMetrics } from './dealMetrics';
import { restorePublishedHistory } from './historyArchiveService';
import { activeBookCondition, activeMembershipCondition } from './activity';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { books, priceSnapshots, wishlistBooks, wishlists } from '../db/schema';

export type RankedBookDeal = {
  bookId: number;
  title: string;
  author: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  currency: string;
  currentListPrice: number | null;
  currentDiscountedPrice: number | null;
  currentDiscountPercent: number | null;
  previousDiscountedPrice: number | null;
  historicalMinDiscountedPrice: number | null;
  dropVsPrevious: number | null;
  savingsVsPreviousPercent: number | null;
  isHistoricalLow: boolean;
  isNewHistoricalLow: boolean;
  hasHighDiscount: boolean;
  looksLikeInflatedBasePrice: boolean;
  dealScore: number;
};

type SnapshotRow = {
  id: number;
  bookId: number;
  listPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  currency: string;
  scrapedAt: string;
};

type RankedBookSource = {
  id: number;
  title: string;
  author: string | null;
  productUrl: string | null;
  imageUrl: string | null;
};

export async function getDealRanking(): Promise<RankedBookDeal[]> {
  await restorePublishedHistory();
  const allBooks = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      productUrl: books.productUrl,
      imageUrl: books.imageUrl,
    })
    .from(books)
    .where(activeBookCondition())
    .orderBy(asc(books.title));

  return buildRanking(allBooks);
}

export async function getDealRankingByWishlist(wishlistId: number): Promise<RankedBookDeal[]> {
  await restorePublishedHistory();
  const wishlistLinkedBooks = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      productUrl: books.productUrl,
      imageUrl: books.imageUrl,
    })
    .from(wishlistBooks)
    .innerJoin(books, eq(books.id, wishlistBooks.bookId))
    .innerJoin(wishlists, eq(wishlists.id, wishlistBooks.wishlistId))
    .where(and(eq(wishlistBooks.wishlistId, wishlistId), activeMembershipCondition()))
    .orderBy(asc(books.title));

  return buildRanking(wishlistLinkedBooks);
}

async function buildRanking(bookList: RankedBookSource[]): Promise<RankedBookDeal[]> {
  const ranking: RankedBookDeal[] = [];

  for (const book of bookList) {
    const snapshots = await db
      .select({
        id: priceSnapshots.id,
        bookId: priceSnapshots.bookId,
        listPrice: priceSnapshots.listPrice,
        discountedPrice: priceSnapshots.discountedPrice,
        discountPercent: priceSnapshots.discountPercent,
        currency: priceSnapshots.currency,
        scrapedAt: priceSnapshots.scrapedAt,
      })
      .from(priceSnapshots)
      .where(eq(priceSnapshots.bookId, book.id))
      .orderBy(desc(priceSnapshots.scrapedAt), desc(priceSnapshots.id));

    if (snapshots.length === 0) continue;

    const current = snapshots[0];
    const previous = snapshots[1] ?? null;

    const metrics = calculateDealMetrics(current, previous, snapshots.slice(1).map(row => row.discountedPrice));

    ranking.push({
      bookId: book.id,
      title: book.title,
      author: book.author,
      productUrl: book.productUrl,
      imageUrl: book.imageUrl,
      currency: current.currency,
      currentListPrice: current.listPrice,
      currentDiscountedPrice: current.discountedPrice,
      currentDiscountPercent: current.discountPercent,
      ...metrics,
    });
  }

  return ranking.sort((a, b) => b.dealScore - a.dealScore);
}
