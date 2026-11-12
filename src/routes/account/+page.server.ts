import { fail, redirect } from '@sveltejs/kit';
import { read, write } from '$lib/server/db';
import {
  PROMOTE_AFTER_PURCHASES, PROMOTE_AFTER_SPENT, VC_DISCOUNT, WARNINGS_LIMIT, money, purchaseHistory, validateDeposit
} from '$lib/server/rules';

export const load = ({ locals, url }) => {
  const me = locals.user;
  if (!me) redirect(303, '/login');
  if (me.role === 'SU') redirect(303, '/admin');
  const ledger = read('ledger');
  const books = read('books');
  const history = purchaseHistory(ledger, me.username);
  const mine = ledger
    .filter((e) => e.username === me.username)
    .reverse()
    .map((e) => ({ ...e, title: books.find((b) => b.id === e.bookId)?.title }));
  const purchases = mine.filter((e) => e.type === 'purchase');
  return {
    me: { name: me.name, role: me.role, balance: me.balance, warnings: me.warnings },
    history,
    entries: mine,
    savings: money(
      purchases.reduce((s, e) => {
        const list = books.find((b) => b.id === e.bookId)?.price ?? e.amount;
        return s + Math.max(0, list - e.amount);
      }, 0)
    ),
    rules: {
      purchasesLeft: Math.max(0, PROMOTE_AFTER_PURCHASES + 1 - history.count),
      spendLeft: money(Math.max(0, PROMOTE_AFTER_SPENT - history.spent)),
      discount: VC_DISCOUNT * 100,
      warningsLimit: WARNINGS_LIMIT
    },
    welcome: url.searchParams.has('welcome')
  };
};

export const actions = {
  deposit: async ({ request, locals }) => {
    const me = locals.user;
    if (!me || me.role === 'SU') return fail(401, { error: 'Log in as a customer to deposit funds.' });
    const raw = String((await request.formData()).get('amount') ?? '').trim();
    const v = validateDeposit(raw);
    if (!v.ok) return fail(400, { error: v.error, amount: raw });
    const balance = money(me.balance + v.amount);
    write('users', read('users').map((u) => (u.username === me.username ? { ...u, balance } : u)));
    write('ledger', [...read('ledger'), { at: new Date().toISOString(), username: me.username, type: 'deposit', amount: v.amount }]);
    return { ok: `Deposited $${v.amount.toFixed(2)}. Your balance is now $${balance.toFixed(2)}.` };
  }
};
