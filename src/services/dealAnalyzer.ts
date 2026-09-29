import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { priceSnapshots } from '../db/schema';
import { calculateDealMetrics } from './dealMetrics';
import { restorePublishedHistory } from './historyArchiveService';

export async function analyzeDeal(input: {
  bookId: number;
  currentListPrice: number | null;
  currentDiscountedPrice: number | null;
  currentDiscountPercent: number | null;
}) {
  await restorePublishedHistory();
  const history = await db.select().from(priceSnapshots).where(eq(priceSnapshots.bookId, input.bookId))
    .orderBy(desc(priceSnapshots.scrapedAt), desc(priceSnapshots.id));
  return calculateDealMetrics({ listPrice: input.currentListPrice, discountedPrice: input.currentDiscountedPrice,
    discountPercent: input.currentDiscountPercent }, history[0] ?? null, history.map(row => row.discountedPrice));
}
