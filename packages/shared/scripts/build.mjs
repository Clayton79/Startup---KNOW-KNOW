// Gera duas saídas: ESM (web/Vite) e CJS (api/NestJS), cada uma marcada com o seu "type".
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');

rmSync(join(root, 'dist'), { recursive: true, force: true });

for (const [config, dir, type] of [
  ['tsconfig.esm.json', 'esm', 'module'],
  ['tsconfig.cjs.json', 'cjs', 'commonjs'],
]) {
  execFileSync(process.execPath, [tsc, '-p', join(root, config)], { cwd: root, stdio: 'inherit' });
  mkdirSync(join(root, 'dist', dir), { recursive: true });
  writeFileSync(join(root, 'dist', dir, 'package.json'), JSON.stringify({ type }) + '\n');
}
