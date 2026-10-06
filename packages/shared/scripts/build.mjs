// Gera duas saídas: ESM (web/Vite) e CJS (api/NestJS), cada uma marcada com o seu "type".
//
// O build é PULADO quando o dist já está mais novo que o código-fonte. Isso evita que `pnpm dev:web`,
// `pnpm test` etc. apaguem e recriem o dist e façam a API em modo watch recompilar/reiniciar à toa.
// Use `--force` para reconstruir do zero (ex.: depois de apagar um arquivo em src/).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');

function newestModification(directory) {
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    newest = Math.max(
      newest,
      entry.isDirectory() ? newestModification(path) : statSync(path).mtimeMs,
    );
  }
  return newest;
}

const inputs = Math.max(
  newestModification(join(root, 'src')),
  ...['package.json', 'tsconfig.json', 'tsconfig.esm.json', 'tsconfig.cjs.json'].map(
    (file) => statSync(join(root, file)).mtimeMs,
  ),
);
const outputs = ['esm/index.js', 'cjs/index.js', 'esm/package.json', 'cjs/package.json'].map(
  (file) => join(root, 'dist', file),
);
const upToDate =
  !process.argv.includes('--force') &&
  outputs.every((file) => existsSync(file) && statSync(file).mtimeMs >= inputs);

if (upToDate) {
  console.log('shared: dist já está atualizado (use --force para reconstruir).');
} else {
  rmSync(join(root, 'dist'), { recursive: true, force: true });

  for (const [config, dir, type] of [
    ['tsconfig.esm.json', 'esm', 'module'],
    ['tsconfig.cjs.json', 'cjs', 'commonjs'],
  ]) {
    execFileSync(process.execPath, [tsc, '-p', join(root, config)], {
      cwd: root,
      stdio: 'inherit',
    });
    mkdirSync(join(root, 'dist', dir), { recursive: true });
    writeFileSync(join(root, 'dist', dir, 'package.json'), JSON.stringify({ type }) + '\n');
  }
}
