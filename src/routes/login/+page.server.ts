import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { read, write, type User } from '$lib/server/db';
import { checkPassword, hashPassword, newToken } from '$lib/server/auth';

const SUSPENDED = 'This account is suspended. Ask the store manager to deposit funds and reopen it.';

function startSession(cookies: Cookies, username: string) {
  const token = newToken();
  write('sessions', { ...read('sessions'), [token]: username });
  cookies.set('session', token, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
}

export const load = ({ locals }) => {
  if (locals.user) redirect(303, '/');
  return {
    demoAccounts:
      env.DEMO_MODE === '1'
        ? read('users').map((u) => ({ username: u.username, role: u.role, suspended: u.suspended, warnings: u.warnings, balance: u.balance }))
        : []
  };
};

export const actions = {
  login: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!username || !password) return fail(400, { error: 'Enter your username and password.', username });
    const user = read('users').find((u) => u.username === username);
    if (!user || !checkPassword(password, user.passwordHash)) {
      return fail(400, { error: 'That username and password do not match.', username });
    }
    if (user.suspended) return fail(403, { error: SUSPENDED, username });
    startSession(cookies, user.username);
    redirect(303, '/');
  },

  register: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get('username') ?? '').trim().toLowerCase();
    const name = String(form.get('name') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const values = { regUsername: username, regName: name };
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return fail(400, { regError: 'Usernames are 3 to 20 letters, numbers or underscores.', ...values });
    }
    if (name.length < 1 || name.length > 60) return fail(400, { regError: 'Tell us your name.', ...values });
    if (password.length < 6) return fail(400, { regError: 'Passwords need at least 6 characters.', ...values });
    const users = read('users');
    if (users.some((u) => u.username === username)) return fail(400, { regError: 'That username is taken.', ...values });
    const user: User = { username, name, passwordHash: hashPassword(password), role: 'RC', balance: 0, warnings: 0, suspended: false };
    write('users', [...users, user]);
    startSession(cookies, username);
    redirect(303, '/account?welcome=1');
  },

  // DEMO_MODE only: one-click login for the seeded accounts. Suspension still applies.
  demo: async ({ request, cookies }) => {
    if (env.DEMO_MODE !== '1') return fail(403, { error: 'Demo login is turned off.' });
    const username = String((await request.formData()).get('username') ?? '');
    const user = read('users').find((u) => u.username === username);
    if (!user) return fail(400, { error: 'No such account.' });
    if (user.suspended) return fail(403, { error: `${user.name}: ${SUSPENDED}` });
    startSession(cookies, user.username);
    redirect(303, '/');
  },

  logout: async ({ cookies }) => {
    const token = cookies.get('session');
    if (token) {
      const sessions = read('sessions');
      delete sessions[token];
      write('sessions', sessions);
    }
    cookies.delete('session', { path: '/' });
    redirect(303, '/');
  }
};
