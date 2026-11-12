// Every business rule in one place. Pure functions: no file access, easy to test.
// "What if it were 5 purchases?" -> change the constant below.

export const FINE = 1; // $ charged when a purchase costs more than the balance
export const VC_DISCOUNT = 0.1; // VIP customers pay 10% less
export const PROMOTE_AFTER_PURCHASES = 3; // RC becomes VC with MORE than this many purchases...
export const PROMOTE_AFTER_SPENT = 200; // ...or MORE than this many dollars spent
export const TABOO_BLOCK_OVER = 3; // a comment with MORE than this many taboo words is blocked
export const WARNINGS_LIMIT = 2; // MORE than this many warnings: RC suspended, VC demoted
export const PURCHASER_WEIGHT = 2; // a purchaser's rating counts this many times
export const ORDER_LIST_MIN_RATINGS = 3; // a book needs MORE than this many ratings to be listed
export const NO_ORDER_BELOW = 2; // weighted average below this -> no-order list
export const TO_ORDER_ABOVE = 4; // weighted average above this -> to-order list
export const MAX_DEPOSIT = 10_000;
export const RAG_MIN_SCORE = 0.6; // cosine similarity a store-file chunk needs to answer from the files
export const PICTURE_MATCHES = 3; // how many books picture search shows

type Role = 'SU' | 'RC' | 'VC';
interface Account {
  role: Role;
  balance: number;
  warnings: number;
  suspended: boolean;
}

export const money = (n: number) => Math.round(n * 100) / 100;

/** What this user pays for a book. */
export function priceFor(role: Role, listPrice: number): number {
  return money(role === 'VC' ? listPrice * (1 - VC_DISCOUNT) : listPrice);
}

export function shouldPromote(role: Role, purchaseCount: number, spent: number): boolean {
  return role === 'RC' && (purchaseCount > PROMOTE_AFTER_PURCHASES || spent > PROMOTE_AFTER_SPENT);
}

export type PurchaseResult<A> =
  | { ok: true; account: A; charged: number; promoted: boolean }
  | { ok: false; account: A; fined: number; suspended: boolean };

/**
 * One click, one book. If the price is more than the balance the purchase is rejected
 * and a fine is charged; a negative balance suspends the account.
 * `history` is the user's purchases BEFORE this one.
 */
export function purchase<A extends Account>(
  account: A,
  listPrice: number,
  history: { count: number; spent: number }
): PurchaseResult<A> {
  const cost = priceFor(account.role, listPrice);
  if (cost > account.balance) {
    const balance = money(account.balance - FINE);
    const suspended = balance < 0;
    return { ok: false, account: { ...account, balance, suspended: account.suspended || suspended }, fined: FINE, suspended };
  }
  const after = { ...account, balance: money(account.balance - cost) };
  const promoted = shouldPromote(after.role, history.count + 1, money(history.spent + cost));
  if (promoted) after.role = 'VC';
  return { ok: true, account: after, charged: cost, promoted };
}

export function validateDeposit(raw: unknown): { ok: true; amount: number } | { ok: false; error: string } {
  const amount = Number(raw);
  if (raw === '' || raw == null || !Number.isFinite(amount)) return { ok: false, error: 'Enter an amount in dollars, like 25 or 12.50.' };
  if (amount <= 0) return { ok: false, error: 'A deposit has to be more than $0.' };
  if (amount > MAX_DEPOSIT) return { ok: false, error: `Deposits are limited to $${MAX_DEPOSIT} at a time.` };
  if (money(amount) !== amount) return { ok: false, error: 'Use at most two decimal places.' };
  return { ok: true, amount };
}

/** The SU can reopen a suspended account only once its balance is positive. */
export function canReopen(account: Account): boolean {
  return account.suspended && account.balance > 0;
}

// ---------- taboo words ----------

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive, whole words, every occurrence counts.
 * Up to the limit: each taboo word becomes "*". Over it: blocked.
 */
export function moderate(text: string, taboo: string[]): { count: number; blocked: boolean; text: string } {
  const words = taboo.map((w) => w.trim()).filter(Boolean);
  if (words.length === 0) return { count: 0, blocked: false, text };
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const count = (text.match(re) ?? []).length;
  if (count > TABOO_BLOCK_OVER) return { count, blocked: true, text: '' };
  return { count, blocked: false, text: text.replace(re, '*') };
}

/** A blocked comment earns one warning. Over the limit: RC suspended, VC demoted (warnings reset). */
export function addWarning<A extends Account>(account: A): { account: A; suspended: boolean; demoted: boolean } {
  const warnings = account.warnings + 1;
  if (warnings > WARNINGS_LIMIT && account.role === 'VC') {
    return { account: { ...account, role: 'RC', warnings: 0 }, suspended: false, demoted: true };
  }
  if (warnings > WARNINGS_LIMIT && account.role === 'RC') {
    return { account: { ...account, warnings, suspended: true }, suspended: true, demoted: false };
  }
  return { account: { ...account, warnings }, suspended: false, demoted: false };
}

// ---------- ratings and order lists ----------

export interface Rating {
  stars: number;
  purchaser: boolean;
}

/** Purchasers' ratings count PURCHASER_WEIGHT times. Returns null with no ratings. */
export function weightedAverage(ratings: Rating[]): number | null {
  if (ratings.length === 0) return null;
  let sum = 0;
  let weight = 0;
  for (const r of ratings) {
    const w = r.purchaser ? PURCHASER_WEIGHT : 1;
    sum += r.stars * w;
    weight += w;
  }
  return sum / weight;
}

export function orderList(ratings: Rating[]): 'to-order' | 'no-order' | null {
  if (ratings.length <= ORDER_LIST_MIN_RATINGS) return null;
  const avg = weightedAverage(ratings)!;
  if (avg < NO_ORDER_BELOW) return 'no-order';
  if (avg > TO_ORDER_ABOVE) return 'to-order';
  return null;
}

export function validRating(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Purchase count and total spent, from the ledger. */
export function purchaseHistory(
  ledger: { username: string; type: string; amount: number }[],
  username: string
): { count: number; spent: number } {
  const mine = ledger.filter((e) => e.username === username && e.type === 'purchase');
  return { count: mine.length, spent: money(mine.reduce((s, e) => s + e.amount, 0)) };
}

/** $12.50, or -$0.50 for negative balances. */
export const usd = (n: number) => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2);

export const FACE_MIN_CONFIDENCE = 0.8; // face login accepts the top class only above this confidence
export const FACE_FRAMES = 20; // webcam frames captured when enrolling
