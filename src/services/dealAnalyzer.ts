import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { priceSnapshots } from '../db/schema';

export type DealAnalysisResult = {
  previousDiscountedPrice: number | null;
  lowestHistoricalDiscountedPrice: number | null;
  droppedVsPrevious: boolean;
  isHistoricalLow: boolean;
  hasHighDiscount: boolean;
  looksLikeInflatedBasePrice: boolean;
};

type AnalyzeDealInput = {
  bookId: number;
  currentListPrice: number | null;
  currentDiscountedPrice: number | null;
  currentDiscountPercent: number | null;
};

export async function analyzeDeal(
  input: AnalyzeDealInput
): Promise<DealAnalysisResult> {
  const [previousSnapshot] = await db
    .select({
      discountedPrice: priceSnapshots.discountedPrice,
      listPrice: priceSnapshots.listPrice,
      discountPercent: priceSnapshots.discountPercent,
      scrapedAt: priceSnapshots.scrapedAt,
    })
    .from(priceSnapshots)
    .where(eq(priceSnapshots.bookId, input.bookId))
    .orderBy(desc(priceSnapshots.scrapedAt))
    .limit(1);

  const [historicalMin] = await db
    .select({
      minDiscountedPrice: sql<number | null>`min(${priceSnapshots.discountedPrice})`,
    })
    .from(priceSnapshots)
    .where(eq(priceSnapshots.bookId, input.bookId));

  const previousDiscountedPrice = previousSnapshot?.discountedPrice ?? null;
  const lowestHistoricalDiscountedPrice = historicalMin?.minDiscountedPrice ?? null;

  const droppedVsPrevious =
    input.currentDiscountedPrice !== null &&
    previousDiscountedPrice !== null &&
    input.currentDiscountedPrice < previousDiscountedPrice;

  const isHistoricalLow =
    input.currentDiscountedPrice !== null &&
    (lowestHistoricalDiscountedPrice === null ||
      input.currentDiscountedPrice < lowestHistoricalDiscountedPrice);

  const hasHighDiscount =
    input.currentDiscountPercent !== null && input.currentDiscountPercent >= 40;

  const looksLikeInflatedBasePrice =
    input.currentListPrice !== null &&
    input.currentDiscountedPrice !== null &&
    previousSnapshot?.listPrice !== null &&
    previousDiscountedPrice !== null &&
    input.currentListPrice > previousSnapshot.listPrice &&
    input.currentDiscountPercent !== null &&
    previousSnapshot.discountPercent !== null &&
    input.currentDiscountPercent > previousSnapshot.discountPercent &&
    input.currentDiscountedPrice >= previousDiscountedPrice;

  return {
    previousDiscountedPrice,
    lowestHistoricalDiscountedPrice,
    droppedVsPrevious,
    isHistoricalLow,
    hasHighDiscount,
    looksLikeInflatedBasePrice,
  };
}
