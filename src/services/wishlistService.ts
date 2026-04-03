import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { wishlists, wishlistBooks } from '../db/schema';

type UpsertWishlistInput = {
  name: string;
  url: string;
};

export async function upsertWishlist(input: UpsertWishlistInput): Promise<number> {
  const existing = await db
    .select()
    .from(wishlists)
    .where(eq(wishlists.url, input.url))
    .limit(1);

  if (existing.length > 0) {
    const wishlist = existing[0];
    const updatePayload = {
      name: input.name,
      updatedAt: new Date().toISOString(),
      isActive: true,
    } as any;

    await db
      .update(wishlists)
      .set(updatePayload)
      .where(eq(wishlists.id, wishlist.id));

    return wishlist.id;
  }

  const insertPayload = {
    name: input.name,
    url: input.url,
    updatedAt: new Date().toISOString(),
    isActive: true,
  } as any;

  const inserted = await db
    .insert(wishlists)
    .values(insertPayload)
    .returning({ id: wishlists.id });

  return inserted[0].id;
}

export async function linkBookToWishlist(wishlistId: number, bookId: number): Promise<void> {
  const existing = await db
    .select()
    .from(wishlistBooks)
    .where(and(eq(wishlistBooks.wishlistId, wishlistId), eq(wishlistBooks.bookId, bookId)))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(wishlistBooks).values({
    wishlistId,
    bookId,
  });
}
