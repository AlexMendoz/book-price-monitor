import { db } from '../db/client';
import { priceSnapshots } from '../db/schema';

export async function createPriceSnapshot(input: {
  bookId: number;
  listPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  currency: string;
}): Promise<void> {
  await db.insert(priceSnapshots).values({
    bookId: input.bookId,
    listPrice: input.listPrice,
    discountedPrice: input.discountedPrice,
    discountPercent: input.discountPercent,
    currency: input.currency,
    scrapedAt: new Date().toISOString(),
  });
}
