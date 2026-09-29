import { sqlite } from '../db/client';

export function productIdentity(value: string): string {
  try {
    const url = new URL(value);
    const productId = url.pathname.match(/\/p\/(\d+)\/?$/)?.[1];
    if (productId && /(^|\.)buscalibre\./i.test(url.hostname)) return `${url.hostname.toLowerCase()}:product:${productId}`;
    url.hash = '';
    return url.href;
  } catch { return value; }
}

export function findBookByProductUrl(url: string): { id: number } | undefined {
  const identity = productIdentity(url);
  return sqlite.prepare('SELECT id, product_url FROM books WHERE product_url IS NOT NULL ORDER BY id').all()
    .find((book: { product_url: string }) => productIdentity(book.product_url) === identity);
}

export function reconcileBookAliases(): number {
  const canonical = new Map<string, number>();
  let count = 0;
  for (const book of sqlite.prepare('SELECT id, product_url FROM books WHERE product_url IS NOT NULL ORDER BY id').all()) {
    const identity = productIdentity(book.product_url);
    const target = canonical.get(identity);
    if (target === undefined) { canonical.set(identity, book.id); continue; }
    // Retain every price observation, even if two legacy identities share a run.
    sqlite.prepare('UPDATE price_snapshots SET run_id = NULL WHERE book_id = ? AND run_id IN (SELECT run_id FROM price_snapshots WHERE book_id = ?)').run(book.id, target);
    const moved = sqlite.prepare('UPDATE price_snapshots SET book_id = ? WHERE book_id = ?').run(target, book.id).changes;
    sqlite.prepare(`INSERT INTO wishlist_books(wishlist_id, book_id, is_active, last_seen_at)
      SELECT wishlist_id, ?, is_active, last_seen_at FROM wishlist_books WHERE book_id = ?
      ON CONFLICT(wishlist_id, book_id) DO UPDATE SET
        is_active = MAX(wishlist_books.is_active, excluded.is_active),
        last_seen_at = MAX(COALESCE(wishlist_books.last_seen_at, ''), COALESCE(excluded.last_seen_at, ''))`).run(target, book.id);
    sqlite.prepare(`UPDATE books SET last_seen_at = MAX(COALESCE(last_seen_at, ''), COALESCE((SELECT last_seen_at FROM books WHERE id = ?), '')),
      is_active = MAX(is_active, (SELECT is_active FROM books WHERE id = ?)) WHERE id = ?`).run(book.id, book.id, target);
    sqlite.prepare('UPDATE wishlist_books SET is_active = false WHERE book_id = ?').run(book.id);
    sqlite.prepare('UPDATE books SET is_active = false WHERE id = ?').run(book.id);
    if (moved) count++;
  }
  return count;
}
