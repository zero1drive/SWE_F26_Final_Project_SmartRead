import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // data/ changes on every click; don't reload the page when it does
  server: { watch: { ignored: ['**/data/**', '**/face/**'] } },
  test: { include: ['src/**/*.test.ts'] }
});
