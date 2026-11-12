import { read } from '$lib/server/db';
import { personal, popular } from '$lib/server/recommend';

export const load = ({ locals }) => {
  const books = read('books');
  const views = read('views');
  const ledger = read('ledger');
  const user = locals.user;

  const top =
    user && user.role !== 'SU'
      ? personal(user.username, books, views, ledger)
      : { books: popular(books, views, ledger), personalised: false };

  const categories = [...new Set(books.map((b) => b.category))].sort();
  const hour = new Date().getHours();
  return {
    greeting: hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening',
    top,
    shelves: categories.map((c) => ({ category: c, books: books.filter((b) => b.category === c) }))
  };
};
