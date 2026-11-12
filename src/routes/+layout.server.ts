import { env } from '$env/dynamic/private';

export const load = ({ locals }) => ({
  user: locals.user
    ? { username: locals.user.username, name: locals.user.name, role: locals.user.role, balance: locals.user.balance }
    : null,
  demoMode: env.DEMO_MODE === '1'
});
