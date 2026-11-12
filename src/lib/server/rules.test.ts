import { describe, expect, it } from 'vitest';
import {
  addWarning,
  canReopen,
  moderate,
  orderList,
  priceFor,
  purchase,
  validateDeposit,
  validRating,
  weightedAverage
} from './rules';

const rc = { role: 'RC' as const, balance: 50, warnings: 0, suspended: false };
const vc = { ...rc, role: 'VC' as const };
const fresh = { count: 0, spent: 0 };

describe('purchases, fines and suspension', () => {
  it('deducts the price when the balance covers it', () => {
    const r = purchase(rc, 12, fresh);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.account.balance).toBe(38);
  });

  it('allows spending the balance down to exactly zero', () => {
    const r = purchase({ ...rc, balance: 12 }, 12, fresh);
    expect(r.ok && r.account.balance).toBe(0);
  });

  it('rejects and fines $1 when the price exceeds the balance', () => {
    const r = purchase({ ...rc, balance: 5 }, 12, fresh);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.account.balance).toBe(4);
      expect(r.fined).toBe(1);
      expect(r.account.suspended).toBe(false);
    }
  });

  it('suspends the account when the fine makes the balance negative', () => {
    const r = purchase({ ...rc, balance: 0.5 }, 12, fresh);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.account.balance).toBe(-0.5);
      expect(r.suspended).toBe(true);
      expect(r.account.suspended).toBe(true);
    }
  });

  it('lets the SU reopen only once the balance is positive', () => {
    expect(canReopen({ ...rc, suspended: true, balance: -2 })).toBe(false);
    expect(canReopen({ ...rc, suspended: true, balance: 0 })).toBe(false);
    expect(canReopen({ ...rc, suspended: true, balance: 3 })).toBe(true);
  });
});

describe('VIP discount', () => {
  it('gives VC 10% off', () => {
    expect(priceFor('VC', 12)).toBe(10.8);
    expect(priceFor('RC', 12)).toBe(12);
  });
  it('charges VC the discounted price', () => {
    const r = purchase(vc, 10, fresh);
    expect(r.ok && r.charged).toBe(9);
  });
});

describe('promotion', () => {
  it('promotes an RC on the 4th purchase (more than 3)', () => {
    const third = purchase(rc, 5, { count: 2, spent: 10 });
    expect(third.ok && third.promoted).toBe(false);
    const fourth = purchase(rc, 5, { count: 3, spent: 15 });
    expect(fourth.ok && fourth.promoted).toBe(true);
    expect(fourth.account.role).toBe('VC');
  });
  it('promotes an RC who has spent more than $200', () => {
    const r = purchase({ ...rc, balance: 500 }, 10, { count: 1, spent: 195 });
    expect(r.ok && r.promoted).toBe(true);
  });
  it('does not promote at exactly $200', () => {
    const r = purchase({ ...rc, balance: 500 }, 10, { count: 1, spent: 190 });
    expect(r.ok && r.promoted).toBe(false);
  });
});

describe('deposits', () => {
  it('accepts positive amounts', () => expect(validateDeposit('25.50')).toEqual({ ok: true, amount: 25.5 }));
  it('rejects zero, negatives, text and too many decimals', () => {
    for (const bad of ['0', '-5', 'abc', '', '1.234']) expect(validateDeposit(bad).ok).toBe(false);
  });
});

describe('taboo words', () => {
  const taboo = ['darn', 'heck'];
  it('replaces each taboo word with * up to 3', () => {
    expect(moderate('Darn it, what the heck.', taboo)).toEqual({ count: 2, blocked: false, text: '* it, what the *.' });
  });
  it('matches whole words only', () => {
    expect(moderate('Darnell checked the heckler', taboo).count).toBe(0);
  });
  it('counts every occurrence, case-insensitively', () => {
    expect(moderate('DARN darn Darn', taboo)).toEqual({ count: 3, blocked: false, text: '* * *' });
  });
  it('blocks more than 3', () => {
    expect(moderate('darn heck darn heck', taboo).blocked).toBe(true);
  });
  it('leaves clean comments alone', () => {
    expect(moderate('Lovely book.', taboo)).toEqual({ count: 0, blocked: false, text: 'Lovely book.' });
  });
});

describe('warnings', () => {
  it('adds a warning without consequences up to 2', () => {
    const r = addWarning({ ...rc, warnings: 1 });
    expect(r.account.warnings).toBe(2);
    expect(r.suspended).toBe(false);
  });
  it('suspends an RC on the 3rd warning', () => {
    const r = addWarning({ ...rc, warnings: 2 });
    expect(r.suspended).toBe(true);
    expect(r.account.suspended).toBe(true);
  });
  it('demotes a VC on the 3rd warning and resets warnings', () => {
    const r = addWarning({ ...vc, warnings: 2 });
    expect(r.demoted).toBe(true);
    expect(r.account).toMatchObject({ role: 'RC', warnings: 0, suspended: false });
  });
});

describe('weighted ratings and order lists', () => {
  it('counts purchasers twice', () => {
    expect(weightedAverage([{ stars: 5, purchaser: true }, { stars: 2, purchaser: false }])).toBe(4);
  });
  it('needs more than 3 ratings', () => {
    const three = [1, 1, 1].map((stars) => ({ stars, purchaser: false }));
    expect(orderList(three)).toBe(null);
    expect(orderList([...three, { stars: 1, purchaser: false }])).toBe('no-order');
  });
  it('puts high averages on the to-order list', () => {
    expect(orderList([5, 5, 4, 5].map((stars) => ({ stars, purchaser: false })))).toBe('to-order');
  });
  it('leaves an average of exactly 4 off both lists', () => {
    expect(orderList([4, 4, 4, 4].map((stars) => ({ stars, purchaser: false })))).toBe(null);
  });
  it('validates 1 to 5 whole stars', () => {
    expect(validRating('3')).toBe(3);
    expect(validRating('0')).toBe(null);
    expect(validRating('6')).toBe(null);
    expect(validRating('2.5')).toBe(null);
  });
});
