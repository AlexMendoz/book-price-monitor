import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { books } from '../db/schema';

type UpsertBookInput = {
  title: string;
  author: string | null;
  productUrl: string | null;
  imageUrl: string | null;
};

export async function upsertBook(input: UpsertBookInput): Promise<number> {
  if (input.productUrl) {
    const existing = await db
      .select()
      .from(books)
      .where(eq(books.productUrl, input.productUrl))
      .limit(1);

    if (existing.length > 0) {
      const book = existing[0];
      const updatePayload = {
        title: input.title,
        author: input.author,
        imageUrl: input.imageUrl,
        updatedAt: new Date().toISOString(),
        isActive: true,
      } as any;

      await db
        .update(books)
        .set(updatePayload)
        .where(eq(books.id, book.id));

      return book.id;
    }
  }

  const insertPayload = {
    title: input.title,
    author: input.author,
    productUrl: input.productUrl,
    imageUrl: input.imageUrl,
    isActive: true,
    updatedAt: new Date().toISOString(),
  } as any;

  const inserted = await db
    .insert(books)
    .values(insertPayload)
    .returning({ id: books.id });

  return inserted[0].id;
}
