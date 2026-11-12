import { json } from '@sveltejs/kit';
import { answer } from '$lib/server/chat';

export const POST = async ({ request, locals }) => {
  const body = await request.json().catch(() => ({}));
  return json(await answer(String(body.question ?? ''), locals.user));
};
