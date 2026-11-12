// Logs one view each time a book page is opened (called from the page's onMount).
import { read, write } from '$lib/server/db';

export const POST = ({ params, locals }) => {
  if (!read('books').some((b) => b.id === params.id)) return new Response('no such book', { status: 404 });
  write('views', [...read('views'), { at: new Date().toISOString(), username: locals.user?.username ?? null, bookId: params.id }]);
  return new Response(null, { status: 204 });
};
