import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { books, priceSnapshots, wishlistBooks } from '../db/schema';

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

export async function getDealRankingByWishlist(wishlistId: number): Promise<RankedBookDeal[]> {
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
    .where(eq(wishlistBooks.wishlistId, wishlistId))
    .orderBy(asc(books.title));

  const ranking: RankedBookDeal[] = [];

  for (const book of wishlistLinkedBooks) {
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

    const historicalValues = snapshots
      .map((s) => s.discountedPrice)
      .filter((v): v is number => v !== null);

    const historicalMinDiscountedPrice =
      historicalValues.length > 0 ? Math.min(...historicalValues) : null;

    const dropVsPrevious =
      current.discountedPrice !== null && previous?.discountedPrice !== null
        ? previous.discountedPrice - current.discountedPrice
        : null;

    const savingsVsPreviousPercent =
      dropVsPrevious !== null &&
      previous?.discountedPrice !== null &&
      previous.discountedPrice > 0
        ? (dropVsPrevious / previous.discountedPrice) * 100
        : null;

    const isHistoricalLow =
      current.discountedPrice !== null &&
      historicalMinDiscountedPrice !== null &&
      current.discountedPrice <= historicalMinDiscountedPrice;

    const hasHighDiscount =
      current.discountPercent !== null && current.discountPercent >= 40;

    const looksLikeInflatedBasePrice =
      current.listPrice !== null &&
      current.discountedPrice !== null &&
      current.discountPercent !== null &&
      previous?.listPrice !== null &&
      previous?.discountedPrice !== null &&
      previous?.discountPercent !== null &&
      current.listPrice > previous.listPrice &&
      current.discountPercent > previous.discountPercent &&
      current.discountedPrice >= previous.discountedPrice;

    let dealScore = 0;
    if (isHistoricalLow) dealScore += 50;
    if ((dropVsPrevious ?? 0) > 0) dealScore += 30;
    if (hasHighDiscount) dealScore += 20;
    if (savingsVsPreviousPercent !== null) dealScore += Math.min(savingsVsPreviousPercent, 25);
    if (looksLikeInflatedBasePrice) dealScore -= 25;

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
      previousDiscountedPrice: previous?.discountedPrice ?? null,
      historicalMinDiscountedPrice,
      dropVsPrevious,
      savingsVsPreviousPercent,
      isHistoricalLow,
      hasHighDiscount,
      looksLikeInflatedBasePrice,
      dealScore,
    });
  }

  return ranking.sort((a, b) => b.dealScore - a.dealScore);
}