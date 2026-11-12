// Proxy to the Python face service (face/server.py) so the browser only talks to SvelteKit.
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const FACE = () => env.FACE_URL || 'http://127.0.0.1:8001';
const DOWN = 'The face login service is not running (start it with the command in README.md). Password login still works.';

export const GET = async () => {
  try {
    const r = await fetch(`${FACE()}/status`, { signal: AbortSignal.timeout(3000) });
    return json({ up: true, ...(await r.json()) });
  } catch {
    return json({ up: false, error: DOWN });
  }
};

// Enrol the logged-in user's face from ~20 webcam frames.
export const POST = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Log in with your password first, then enrol your face.' }, { status: 401 });
  const { images } = await request.json().catch(() => ({ images: [] }));
  if (!Array.isArray(images) || images.length < 5) return json({ error: 'Not enough camera frames were captured.' }, { status: 400 });
  try {
    const r = await fetch(`${FACE()}/enroll`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: locals.user.username, images })
    });
    const body = await r.json();
    return r.ok ? json({ ok: true, saved: body.saved }) : json({ error: body.detail ?? 'Enrolment failed.' }, { status: r.status });
  } catch {
    return json({ error: DOWN }, { status: 503 });
  }
};
