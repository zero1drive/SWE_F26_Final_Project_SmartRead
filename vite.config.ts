import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // data/ changes on every click; don't reload the page when it does
  server: { watch: { ignored: ['**/data/**', '**/face/**'] } },
  test: { include: ['src/**/*.test.ts'] }
});
