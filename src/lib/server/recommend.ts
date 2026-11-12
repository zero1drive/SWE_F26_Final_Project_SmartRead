// Top-3 books for the home page. Plain counting, no ML.
import type { Book, LedgerEntry, View } from './db';

const PURCHASE_WEIGHT = 3; // a purchase says more than a page view
const VIEW_WEIGHT = 1;

/** Most purchased + viewed overall. Shown to SU and visitors, and as the fallback. */
export function popular(books: Book[], views: View[], ledger: LedgerEntry[], n = 3): Book[] {
  const score = new Map<string, number>();
  for (const v of views) score.set(v.bookId, (score.get(v.bookId) ?? 0) + VIEW_WEIGHT);
  for (const e of ledger) {
    if (e.type === 'purchase' && e.bookId) score.set(e.bookId, (score.get(e.bookId) ?? 0) + PURCHASE_WEIGHT);
  }
  return [...books].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0)).slice(0, n);
}

/**
 * For RC/VC: score each book they don't own by how much its category and author
 * overlap with what they've viewed and bought. Falls back to popular() with no history.
 */
export function personal(
  username: string,
  books: Book[],
  views: View[],
  ledger: LedgerEntry[],
  n = 3
): { books: Book[]; personalised: boolean } {
  const byId = new Map(books.map((b) => [b.id, b]));
  const owned = new Set(
    ledger.filter((e) => e.username === username && e.type === 'purchase').map((e) => e.bookId)
  );
  const cat = new Map<string, number>();
  const auth = new Map<string, number>();
  const add = (bookId: string, w: number) => {
    const b = byId.get(bookId);
    if (!b) return;
    cat.set(b.category, (cat.get(b.category) ?? 0) + w);
    auth.set(b.author, (auth.get(b.author) ?? 0) + w);
  };
  for (const v of views) if (v.username === username) add(v.bookId, VIEW_WEIGHT);
  for (const id of owned) if (id) add(id, PURCHASE_WEIGHT);

  if (cat.size === 0) return { books: popular(books, views, ledger, n), personalised: false };

  const scored = books
    .filter((b) => !owned.has(b.id))
    .map((b) => ({ b, s: (cat.get(b.category) ?? 0) + 2 * (auth.get(b.author) ?? 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.b);
  // top up with popular books if their history only points at a couple of titles
  for (const b of popular(books.filter((b) => !owned.has(b.id)), views, ledger, books.length)) {
    if (scored.length >= n) break;
    if (!scored.includes(b)) scored.push(b);
  }
  return { books: scored.slice(0, n), personalised: true };
}
