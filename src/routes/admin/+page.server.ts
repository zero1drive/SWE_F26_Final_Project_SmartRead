import fs from 'node:fs';
import path from 'node:path';
import { error, fail } from '@sveltejs/kit';
import { read, write, type Book } from '$lib/server/db';
import { canReopen, money, validateDeposit } from '$lib/server/rules';
import { financeReport, orderLists } from '$lib/server/reports';
import { makeCover } from '$lib/server/cover';

function requireSU(locals: App.Locals) {
  if (locals.user?.role !== 'SU') error(403, 'Only the store manager can open this page.');
}

export const load = ({ locals }) => {
  requireSU(locals);
  return {
    users: read('users')
      .filter((u) => u.role !== 'SU')
      .map(({ passwordHash, ...u }) => ({ ...u, reopenable: canReopen(u) })),
    taboo: read('taboo'),
    lists: orderLists(),
    finance: financeReport(),
    categories: [...new Set(read('books').map((b) => b.category))].sort()
  };
};

const COVER_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const actions = {
  addBook: async ({ request, locals }) => {
    requireSU(locals);
    const form = await request.formData();
    const f = (k: string) => String(form.get(k) ?? '').trim();
    const values = { title: f('title'), author: f('author'), category: f('category'), year: f('year'), price: f('price'), description: f('description') };
    const bad = (bookError: string) => fail(400, { bookError, values });

    if (!values.title) return bad('The book needs a title.');
    if (!values.author) return bad('The book needs an author.');
    if (!values.category) return bad('Choose or type a category.');
    const year = Number(values.year);
    if (!Number.isInteger(year) || year < 0 || year > new Date().getFullYear()) return bad('Enter a year like 1865.');
    const price = Number(values.price);
    if (!Number.isFinite(price) || price <= 0 || money(price) !== price) return bad('Enter a price above $0, like 9.99.');
    if (values.description.length < 10) return bad('Write a sentence or two of description.');

    const books = read('books');
    if (books.some((b) => b.title.toLowerCase() === values.title.toLowerCase() && b.author.toLowerCase() === values.author.toLowerCase())) {
      return bad('That book is already in the catalog.');
    }
    const id = `b${Date.now().toString(36)}`;
    const dir = path.resolve('static/covers');
    fs.mkdirSync(dir, { recursive: true });
    let cover: string;
    const file = form.get('cover');
    if (file instanceof File && file.size > 0) {
      const ext = COVER_TYPES[file.type];
      if (!ext) return bad('Covers must be JPEG, PNG or WebP images.');
      if (file.size > 5_000_000) return bad('That cover is over 5 MB; try a smaller image.');
      fs.writeFileSync(path.join(dir, `${id}.${ext}`), Buffer.from(await file.arrayBuffer()));
      cover = `/covers/${id}.${ext}`;
    } else {
      fs.writeFileSync(path.join(dir, `${id}.svg`), makeCover(values.title, values.author, books.length));
      cover = `/covers/${id}.svg`;
    }
    const book: Book = { id, title: values.title, author: values.author, category: values.category, year, price, description: values.description, cover };
    write('books', [...books, book]);
    return { bookAdded: `Added "${book.title}" to the catalog.`, bookId: id };
  },

  addTaboo: async ({ request, locals }) => {
    requireSU(locals);
    const word = String((await request.formData()).get('word') ?? '').trim().toLowerCase();
    if (!word) return fail(400, { tabooError: 'Type a word to add.' });
    if (!/^[\p{L}\p{N}'-]+$/u.test(word)) return fail(400, { tabooError: 'Add one word at a time, without spaces.' });
    const list = read('taboo');
    if (list.includes(word)) return fail(400, { tabooError: `"${word}" is already on the list.` });
    write('taboo', [...list, word].sort());
    return { tabooOk: `Added "${word}".` };
  },

  removeTaboo: async ({ request, locals }) => {
    requireSU(locals);
    const word = String((await request.formData()).get('word') ?? '');
    write('taboo', read('taboo').filter((w) => w !== word));
    return { tabooOk: `Removed "${word}".` };
  },

  deposit: async ({ request, locals }) => {
    requireSU(locals);
    const form = await request.formData();
    const username = String(form.get('username') ?? '');
    const v = validateDeposit(String(form.get('amount') ?? '').trim());
    if (!v.ok) return fail(400, { userError: v.error, username });
    const users = read('users');
    const user = users.find((u) => u.username === username && u.role !== 'SU');
    if (!user) return fail(404, { userError: 'No such customer.', username });
    user.balance = money(user.balance + v.amount);
    write('users', users);
    write('ledger', [...read('ledger'), { at: new Date().toISOString(), username, type: 'deposit', amount: v.amount }]);
    return {
      userOk: `Deposited $${v.amount.toFixed(2)} for ${user.name}. Balance is now $${user.balance.toFixed(2)}.` +
        (canReopen(user) ? ' You can reopen the account now.' : user.suspended ? ' The balance must be above $0 to reopen.' : ''),
      username
    };
  },

  reopen: async ({ request, locals }) => {
    requireSU(locals);
    const username = String((await request.formData()).get('username') ?? '');
    const users = read('users');
    const user = users.find((u) => u.username === username);
    if (!user) return fail(404, { userError: 'No such customer.', username });
    if (!canReopen(user)) return fail(400, { userError: `${user.name}'s balance must be above $0 before reopening.`, username });
    user.suspended = false;
    write('users', users);
    return { userOk: `Reopened ${user.name}'s account. They can log in again.`, username };
  }
};
