import { read } from '$lib/server/db';

export const load = ({ url }) => {
  const books = read('books');
  const q = (url.searchParams.get('q') ?? '').trim();
  const category = url.searchParams.get('category') ?? '';
  const author = url.searchParams.get('author') ?? '';
  const from = Number(url.searchParams.get('from')) || null;
  const to = Number(url.searchParams.get('to')) || null;

  // keyword search: plain substring match over title, author and description
  const needle = q.toLowerCase();
  const results = books.filter(
    (b) =>
      (!needle || `${b.title} ${b.author} ${b.description}`.toLowerCase().includes(needle)) &&
      (!category || b.category === category) &&
      (!author || b.author === author) &&
      (!from || b.year >= from) &&
      (!to || b.year <= to)
  );

  return {
    results: results.sort((a, b) => a.year - b.year),
    filters: { q, category, author, from, to },
    categories: [...new Set(books.map((b) => b.category))].sort(),
    authors: [...new Set(books.map((b) => b.author))].sort()
  };
};
