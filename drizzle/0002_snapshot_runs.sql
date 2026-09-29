ALTER TABLE price_snapshots ADD COLUMN run_id text;
--> statement-breakpoint
CREATE UNIQUE INDEX price_snapshots_book_run_unique ON price_snapshots(book_id, run_id);
