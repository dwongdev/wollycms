import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    sourcemap: true,
  },
  server: {
    allowedHosts: ['workpop'],
    proxy: {
      '/api': 'http://localhost:4321',
      '/uploads': 'http://localhost:4321',
    },
  },
});
