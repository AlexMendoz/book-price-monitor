ALTER TABLE books ADD COLUMN last_seen_at text;
--> statement-breakpoint
UPDATE books SET last_seen_at = COALESCE((SELECT MAX(scraped_at) FROM price_snapshots WHERE book_id = books.id), updated_at);
--> statement-breakpoint
ALTER TABLE wishlist_books ADD COLUMN is_active integer NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE wishlist_books ADD COLUMN last_seen_at text;
--> statement-breakpoint
UPDATE wishlist_books SET is_active = (SELECT is_active FROM books WHERE id = book_id), last_seen_at = (SELECT last_seen_at FROM books WHERE id = book_id);
