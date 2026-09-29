import { and, eq, sql } from 'drizzle-orm';
import { books, wishlistBooks, wishlists } from '../db/schema';

export function activeBookCondition() {
  return and(eq(books.isActive, true), sql`julianday(${books.lastSeenAt}) > julianday('now', '-7 days')`);
}

export function activeMembershipCondition() {
  return and(activeBookCondition(), eq(wishlistBooks.isActive, true), eq(wishlists.isActive, true),
    sql`julianday(${wishlistBooks.lastSeenAt}) > julianday('now', '-7 days')`);
}
