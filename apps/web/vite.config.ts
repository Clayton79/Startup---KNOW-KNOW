import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/** Casa arquivos de node_modules de um dos pacotes (funciona com "/" e "\" nos caminhos). */
function inPackages(...names: string[]): RegExp {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`node_modules[\\\\/](${escaped.join('|')})[\\\\/]`);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');
  const apiTarget = env.VITE_DEV_API_TARGET ?? 'http://localhost:3000';

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
      // Em desenvolvimento, `/api` vai para a API local (evita CORS e URL fixa no código).
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    build: {
      sourcemap: false,
      target: 'es2022',
      rolldownOptions: {
        output: {
          // Bibliotecas estáveis em chunks próprios: o navegador reaproveita o cache entre deploys.
          codeSplitting: {
            groups: [
              {
                name: 'react',
                test: inPackages(
                  'react',
                  'react-dom',
                  'react-router',
                  'react-router-dom',
                  'scheduler',
                ),
                priority: 40,
              },
              { name: 'supabase', test: inPackages('@supabase'), priority: 30 },
              { name: 'radix', test: inPackages('radix-ui', '@radix-ui'), priority: 20 },
              {
                name: 'vendor',
                test: inPackages(
                  '@tanstack',
                  'react-hook-form',
                  '@hookform',
                  'zod',
                  'sonner',
                  'lucide-react',
                  'luxon',
                  'clsx',
                  'tailwind-merge',
                  'class-variance-authority',
                ),
                priority: 10,
              },
            ],
          },
        },
      },
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
