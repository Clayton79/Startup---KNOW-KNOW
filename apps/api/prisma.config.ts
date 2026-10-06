import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Em desenvolvimento/teste lê apps/api/.env(.test). Em produção as variáveis vêm do ambiente (Render).
const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({ path: path.resolve(__dirname, `.env.${nodeEnv}`), quiet: true });
loadEnv({ path: path.resolve(__dirname, '.env'), quiet: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations usam a conexão direta (sem pooler). Se DIRECT_URL não existir, cai no DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
