import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: {
    retina: resolve(import.meta.dirname, 'index.html'),
    signIn: resolve(import.meta.dirname, 'sign-in.html')
  } } },
  server: { proxy: { '/api': 'http://localhost:3000' } }
});
