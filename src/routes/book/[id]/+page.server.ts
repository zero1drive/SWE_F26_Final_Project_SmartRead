import { error, fail } from '@sveltejs/kit';
import { read, write, type Review } from '$lib/server/db';
import {
  FINE, addWarning, moderate, orderList, priceFor, purchase, purchaseHistory, usd, validRating, weightedAverage
} from '$lib/server/rules';

function purchasersOf(bookId: string) {
  return new Set(read('ledger').filter((e) => e.type === 'purchase' && e.bookId === bookId).map((e) => e.username));
}

export const load = ({ params, locals }) => {
  const book = read('books').find((b) => b.id === params.id);
  if (!book) error(404, 'We do not have that book.');
  const users = read('users');
  const buyers = purchasersOf(book.id);
  const me = locals.user?.username ?? `visitor:${locals.visitorId}`;
  const reviews = read('reviews')
    .filter((r) => r.bookId === book.id)
    .map((r) => ({
      stars: r.stars,
      comment: r.comment,
      at: r.at,
      name: r.author.startsWith('visitor:') ? 'Visitor' : (users.find((u) => u.username === r.author)?.name ?? r.author),
      verified: buyers.has(r.author),
      mine: r.author === me
    }))
    // verified purchasers first, then newest
    .sort((a, b) => Number(b.verified) - Number(a.verified) || b.at.localeCompare(a.at));
  const ratings = reviews.map((r) => ({ stars: r.stars, purchaser: r.verified }));
  const user = locals.user;
  return {
    book,
    reviews,
    average: weightedAverage(ratings),
    list: orderList(ratings),
    yourPrice: user && user.role !== 'SU' ? priceFor(user.role, book.price) : null,
    owned: user ? buyers.has(user.username) : false
  };
};

export const actions = {
  buy: async ({ params, locals }) => {
    const me = locals.user;
    if (!me) return fail(401, { buyError: 'Log in to buy books.' });
    if (me.role === 'SU') return fail(403, { buyError: 'The manager account cannot buy books.' });
    const book = read('books').find((b) => b.id === params.id);
    if (!book) return fail(404, { buyError: 'That book is gone.' });

    const ledger = read('ledger');
    const result = purchase(me, book.price, purchaseHistory(ledger, me.username));
    const now = new Date().toISOString();
    write('users', read('users').map((u) => (u.username === me.username ? result.account : u)));

    if (!result.ok) {
      write('ledger', [...ledger, { at: now, username: me.username, type: 'fine', amount: result.fined, bookId: book.id }]);
      const cost = priceFor(me.role, book.price).toFixed(2);
      const after = usd(result.account.balance);
      return fail(402, {
        buyError: result.suspended
          ? `Not enough funds: this costs $${cost} and you had $${me.balance.toFixed(2)}. A $${FINE} fine was charged, your balance is now ${after}, and your account is suspended. Ask the store manager to reopen it after a deposit.`
          : `Not enough funds: this costs $${cost} and you have $${me.balance.toFixed(2)}. A $${FINE} fine was charged; your balance is now ${after}.`
      });
    }
    write('ledger', [...ledger, { at: now, username: me.username, type: 'purchase', amount: result.charged, bookId: book.id }]);
    return {
      bought: `Bought for $${result.charged.toFixed(2)}. Your balance is now $${result.account.balance.toFixed(2)}.`,
      promoted: result.promoted
    };
  },

  review: async ({ request, params, locals }) => {
    const form = await request.formData();
    const stars = validRating(form.get('stars'));
    const comment = String(form.get('comment') ?? '').trim();
    if (!stars) return fail(400, { reviewError: 'Choose between 1 and 5 stars.', comment });
    if (comment.length > 2000) return fail(400, { reviewError: 'Please keep comments under 2000 characters.', comment });
    if (!read('books').some((b) => b.id === params.id)) return fail(404, { reviewError: 'That book is gone.' });

    const me = locals.user;
    const author = me?.username ?? `visitor:${locals.visitorId}`;
    const mod = moderate(comment, read('taboo'));

    if (mod.blocked) {
      const base = `Your comment had ${mod.count} words from our taboo list, so it was blocked`;
      if (!me) return fail(400, { reviewError: `${base}.`, comment });
      const w = addWarning(me);
      write('users', read('users').map((u) => (u.username === me.username ? w.account : u)));
      let msg = `${base} and you received a warning (${me.warnings + 1} so far).`;
      if (w.suspended) msg += ' That is more than 2 warnings, so your account is now suspended.';
      if (w.demoted) msg += ' That is more than 2 warnings, so you are no longer a VIP member. Your warnings have been reset.';
      return fail(400, { reviewError: msg, comment });
    }

    const review: Review = { at: new Date().toISOString(), bookId: params.id, author, stars, comment: mod.text };
    const others = read('reviews').filter((r) => !(r.bookId === params.id && r.author === author));
    write('reviews', [...others, review]);
    return {
      reviewed: mod.count
        ? `Thanks. Your review is up, with ${mod.count} ${mod.count === 1 ? 'word' : 'words'} replaced by *.`
        : 'Thanks, your review is up.'
    };
  }
};
