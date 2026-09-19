import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { adminApi } from './vite-plugin-admin.ts';

export default defineConfig({
  base: '/', // custom domain serves from root
  plugins: [react(), adminApi()],
  server: {
    // the admin API writes here; watching it would full-reload on every save
    watch: { ignored: ['**/public/data/family.json'] },
  },
});
