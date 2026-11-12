import { fail } from '@sveltejs/kit';
import { AiDown, cosine, describeImage, embed } from '$lib/server/ai';
import { cachedVectors } from '$lib/server/chat';
import { PICTURE_MATCHES } from '$lib/server/rules';
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

export const actions = {
  // Picture search: vision model describes the image, the description is embedded and
  // compared with every book's embedding by cosine similarity.
  picture: async ({ request }) => {
    const file = (await request.formData()).get('image');
    if (!(file instanceof File) || file.size === 0) return fail(400, { pictureError: 'Choose a picture of a cover or a figure first.' });
    if (!file.type.startsWith('image/')) return fail(400, { pictureError: 'That file is not an image. Try a JPEG or PNG.' });
    if (file.size > 8_000_000) return fail(400, { pictureError: 'That image is over 8 MB; try a smaller one.' });
    try {
      const description = (await describeImage(Buffer.from(await file.arrayBuffer()).toString('base64'))).replace(/\*+/g, '');
      const books = read('books');
      const vectors = await cachedVectors(
        books.map((b) => ({ key: `book:${b.id}`, text: `${b.title} by ${b.author}. ${b.category}, ${b.year}. ${b.description}` }))
      );
      const [qv] = await embed([description], 'search_query');
      const matches = books
        .map((b, i) => ({ id: b.id, title: b.title, author: b.author, cover: b.cover, score: Math.round(cosine(qv, vectors[i]) * 100) / 100 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, PICTURE_MATCHES);
      return { picture: { description, matches } };
    } catch (e) {
      if (e instanceof AiDown) return fail(503, { pictureError: `${e.message} Keyword search still works.` });
      return fail(400, { pictureError: 'We could not read that image. Try another picture or search by keywords.' });
    }
  }
};
