// Numbers for the manager: order lists and the finance report. Computed on the fly, never stored.
import { read } from './db';
import { money, orderList, weightedAverage } from './rules';

export function orderLists() {
  const purchases = read('ledger').filter((e) => e.type === 'purchase');
  const reviews = read('reviews');
  const rows = read('books').map((b) => {
    const buyers = new Set(purchases.filter((e) => e.bookId === b.id).map((e) => e.username));
    const ratings = reviews.filter((r) => r.bookId === b.id).map((r) => ({ stars: r.stars, purchaser: buyers.has(r.author) }));
    return { id: b.id, title: b.title, ratings: ratings.length, average: weightedAverage(ratings), list: orderList(ratings) };
  });
  return {
    toOrder: rows.filter((r) => r.list === 'to-order'),
    noOrder: rows.filter((r) => r.list === 'no-order')
  };
}

export function financeReport() {
  const ledger = read('ledger');
  const books = read('books');
  const sum = (type: string) => money(ledger.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0));
  const sales = books
    .map((b) => {
      const sold = ledger.filter((e) => e.type === 'purchase' && e.bookId === b.id);
      return { id: b.id, title: b.title, copies: sold.length, revenue: money(sold.reduce((s, e) => s + e.amount, 0)) };
    })
    .filter((s) => s.copies > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const revenue = sum('purchase');
  const fines = sum('fine');
  return {
    revenue,
    fines,
    income: money(revenue + fines),
    deposits: sum('deposit'),
    customerBalances: money(read('users').reduce((s, u) => s + u.balance, 0)),
    sales
  };
}
