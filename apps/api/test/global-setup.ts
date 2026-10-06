import { execSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

/** Antes de qualquer teste, garante que o banco `knowknow_test` está com todas as migrations. */
export default function globalSetup(): void {
  const root = path.resolve(__dirname, '..');
  config({ path: path.join(root, '.env.test'), override: true, quiet: true });
  execSync('pnpm exec prisma migrate deploy', {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });
}
