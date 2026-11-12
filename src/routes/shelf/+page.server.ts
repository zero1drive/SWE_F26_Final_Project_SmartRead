import { fail } from '@sveltejs/kit';
import { read, write, type Shelf } from '$lib/server/db';
import { AiDown, chat } from '$lib/server/ai';

const SHELVES = ['want', 'reading', 'finished'] as const;

export const load = ({ locals }) => ({
  books: read('books').map((b) => ({ id: b.id, title: b.title, author: b.author, cover: b.cover })),
  // visitors get null and keep their shelf in sessionStorage instead
  saved: locals.user ? (read('shelves')[locals.user.username] ?? { books: {}, journal: [] }) : null
});

/** Checks a whole shelf sent from the browser before saving it. */
function clean(raw: unknown, bookIds: Set<string>): Shelf | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Shelf;
  const books: Shelf['books'] = {};
  for (const [id, where] of Object.entries(s.books ?? {})) {
    if (bookIds.has(id) && SHELVES.includes(where)) books[id] = where;
  }
  if (!Array.isArray(s.journal) || s.journal.length > 500) return null;
  const journal = s.journal
    .filter((j) => j && typeof j.text === 'string' && j.text.trim() && j.text.length <= 5000 && bookIds.has(j.bookId))
    .map((j) => ({
      id: String(j.id).slice(0, 40),
      at: String(j.at).slice(0, 40),
      bookId: j.bookId,
      text: j.text.trim(),
      ...(typeof j.question === 'string' && j.question ? { question: j.question.slice(0, 1000) } : {})
    }));
  return { books, journal };
}

export const actions = {
  save: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Log in to save your shelf to your account.' });
    let parsed: unknown;
    try {
      parsed = JSON.parse(String((await request.formData()).get('shelf') ?? ''));
    } catch {
      return fail(400, { error: 'That shelf could not be read.' });
    }
    const shelf = clean(parsed, new Set(read('books').map((b) => b.id)));
    if (!shelf) return fail(400, { error: 'That shelf could not be saved.' });
    write('shelves', { ...read('shelves'), [locals.user.username]: shelf });
    return { saved: true };
  },

  // One reflection question about one journal entry. Shown only when asked for; never published.
  reflect: async ({ request }) => {
    const form = await request.formData();
    const text = String(form.get('text') ?? '').trim();
    const title = String(form.get('title') ?? '').slice(0, 200);
    if (!text) return fail(400, { error: 'Write something in the entry first, then ask for a question.' });
    if (text.length > 5000) return fail(400, { error: 'That entry is too long to send.' });
    try {
      const question = await chat([
        {
          role: 'system',
          content:
            'You help readers think more deeply about books. Given a reader\'s journal entry, reply with exactly ONE open-ended reflection question ' +
            'that builds on what they wrote. No preamble, no quotes, one sentence ending in a question mark.'
        },
        { role: 'user', content: `Book: ${title}\n\nJournal entry:\n${text}` }
      ]);
      return { question: question.replace(/^["'\s]+|["'\s]+$/g, '') };
    } catch (e) {
      if (e instanceof AiDown) return fail(503, { error: `${e.message} Your journal still works; only reflection questions are unavailable.` });
      throw e;
    }
  }
};
