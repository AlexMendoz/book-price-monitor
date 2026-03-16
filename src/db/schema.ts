import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const wishlists = sqliteTable(
  'wishlists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    urlUnique: uniqueIndex('wishlists_url_unique').on(table.url),
  })
);

export const books = sqliteTable(
  'books',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    author: text('author'),
    wishlistItemId: text('wishlist_item_id'),
    imageUrl: text('image_url'),
    productUrl: text('product_url'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    productUrlUnique: uniqueIndex('books_product_url_unique').on(table.productUrl),
  })
);

export const wishlistBooks = sqliteTable(
  'wishlist_books',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    wishlistId: integer('wishlist_id')
      .notNull()
      .references(() => wishlists.id),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    wishlistBookUnique: uniqueIndex('wishlist_books_unique').on(table.wishlistId, table.bookId),
  })
);

export const priceSnapshots = sqliteTable('price_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id')
    .notNull()
    .references(() => books.id),
  listPrice: real('list_price'),
  discountedPrice: real('discounted_price'),
  discountPercent: real('discount_percent'),
  currency: text('currency').notNull().default('MXN'),
  scrapedAt: text('scraped_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});
