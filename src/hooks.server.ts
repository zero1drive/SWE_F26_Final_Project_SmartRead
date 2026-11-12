// Who is this? Reads the session cookie on every request.
import { read } from '$lib/server/db';
import { newToken } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  const username = token ? read('sessions')[token] : undefined;
  const user = username ? read('users').find((u) => u.username === username) : undefined;
  event.locals.user = user && !user.suspended ? user : null;

  // Visitors get an anonymous id so "one rating per person per book" works for them too.
  let visitorId = event.cookies.get('visitor');
  if (!visitorId) {
    visitorId = newToken().slice(0, 12);
    event.cookies.set('visitor', visitorId, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  }
  event.locals.visitorId = visitorId;
  return resolve(event);
};
