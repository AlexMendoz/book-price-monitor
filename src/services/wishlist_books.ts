import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { wishlistBooks } from '../db/schema';

export async function upsertWishlistBook(input: {
  wishlistId: number;
  bookId: number;
}): Promise<number> {
  const existing = await db
    .select()
    .from(wishlistBooks)
    .where(
      and(
        eq(wishlistBooks.wishlistId, input.wishlistId),
        eq(wishlistBooks.bookId, input.bookId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(wishlistBooks)
    .values({
      wishlistId: input.wishlistId,
      bookId: input.bookId,
    })
    .returning({ id: wishlistBooks.id });

  return inserted[0].id;
}
