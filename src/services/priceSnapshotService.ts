import { db } from '../db/client';
import { priceSnapshots } from '../db/schema';

export async function createPriceSnapshot(input: {
  bookId: number;
  listPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  currency: string;
}): Promise<void> {
  const insertPayload = {
    bookId: input.bookId,
    listPrice: input.listPrice,
    discountedPrice: input.discountedPrice,
    discountPercent: input.discountPercent,
    currency: input.currency,
    scrapedAt: new Date().toISOString(),
  } as any;

  await db.insert(priceSnapshots).values(insertPayload);
}
