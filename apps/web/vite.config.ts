import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Torna a URL do og:image absoluta quando VITE_SITE_URL estiver definida.
        name: 'know-know-site-url',
        transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl),
      },
    ],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      port: 5173,
      // Em desenvolvimento, `/api` e `/health` vão para a API local (evita CORS e URL fixa no código).
      proxy: {
        '/api': { target: env.VITE_DEV_API_TARGET ?? 'http://localhost:3000', changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
