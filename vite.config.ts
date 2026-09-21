import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { adminApi } from './vite-plugin-admin.ts';

export default defineConfig({
  // Relative, so one build works both at a domain root and under a
  // GitHub Pages project path (/<repo>/). Absolute '/' breaks the latter.
  base: './',
  plugins: [react(), adminApi()],
  server: {
    // the admin API writes here; watching it would full-reload on every save
    watch: { ignored: ['**/public/data/family.json'] },
  },
});
