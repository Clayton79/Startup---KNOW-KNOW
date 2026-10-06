import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Client } from 'pg';
import { E2E } from './env';

/** Cria o banco de e2e (se preciso), aplica as migrations e carrega os dados de demonstração. */
export default async function globalSetup(): Promise<void> {
  const target = new URL(E2E.databaseUrl);
  const databaseName = target.pathname.slice(1);

  const admin = new URL(E2E.databaseUrl);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);
    if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await client.end();
  }

  const apiDir = path.resolve(import.meta.dirname, '../../api');
  const env = { ...process.env, ...E2E.apiEnv };
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const run = (...args: string[]) =>
    execFileSync(pnpm, args, {
      cwd: apiDir,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

  run('exec', 'prisma', 'migrate', 'deploy');
  run('exec', 'tsx', 'prisma/seed.ts', '--reset');
}
