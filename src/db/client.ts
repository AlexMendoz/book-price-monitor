import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const dbPath = process.env.DATABASE_URL || './data/prices.db';
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
bootstrapSchema(sqlite);
export const db = drizzle(sqlite);

function bootstrapSchema(connection: any): void {
  connection.pragma('foreign_keys = ON');

  connection.exec(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      name text NOT NULL,
      url text NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      is_active integer DEFAULT true NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS wishlists_url_unique ON wishlists (url);

    CREATE TABLE IF NOT EXISTS books (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      title text NOT NULL,
      author text,
      wishlist_item_id text,
      image_url text,
      product_url text,
      is_active integer DEFAULT true NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS books_product_url_unique ON books (product_url);

    CREATE TABLE IF NOT EXISTS wishlist_books (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      wishlist_id integer NOT NULL,
      book_id integer NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (wishlist_id) REFERENCES wishlists (id) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (book_id) REFERENCES books (id) ON UPDATE no action ON DELETE no action
    );

    CREATE UNIQUE INDEX IF NOT EXISTS wishlist_books_unique ON wishlist_books (wishlist_id, book_id);

    CREATE TABLE IF NOT EXISTS price_snapshots (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      book_id integer NOT NULL,
      list_price real,
      discounted_price real,
      discount_percent real,
      currency text DEFAULT 'MXN' NOT NULL,
      scraped_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books (id) ON UPDATE no action ON DELETE no action
    );
  `);
}
