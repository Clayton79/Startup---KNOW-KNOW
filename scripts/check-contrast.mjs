// Valida os pares de cor do design system contra WCAG 2.2 AA (texto normal ≥ 4,5:1; UI/texto grande ≥ 3:1).
// Lê os tokens direto de apps/web/src/styles/tokens.css para nunca divergir do que está em produção.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../apps/web/src/styles/tokens.css'),
  'utf8',
);

const tokens = Object.fromEntries(
  [...css.matchAll(/--kk-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
);

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [primeiro plano, fundo, mínimo exigido, descrição]
const pairs = [
  ['text', 'background', 4.5, 'texto sobre fundo da página'],
  ['text', 'surface', 4.5, 'texto sobre card'],
  ['text-muted', 'background', 4.5, 'texto secundário sobre página'],
  ['text-muted', 'surface', 4.5, 'texto secundário sobre card'],
  ['text-muted', 'surface-muted', 4.5, 'texto secundário sobre bloco cinza'],
  ['primary-foreground', 'primary', 4.5, 'texto do botão primário'],
  ['primary-foreground', 'primary-hover', 4.5, 'texto do botão primário (hover)'],
  ['primary', 'surface', 4.5, 'link/ação azul sobre card'],
  ['primary', 'background', 4.5, 'link/ação azul sobre página'],
  ['primary-strong', 'primary-soft', 4.5, 'texto azul sobre fundo azul claro'],
  ['brand', 'secondary', 4.5, 'azul da marca sobre creme'],
  ['secondary-foreground', 'secondary', 4.5, 'texto do botão secundário'],
  ['secondary', 'brand', 4.5, 'creme sobre azul da marca (logo)'],
  ['primary-foreground', 'brand', 4.5, 'branco sobre azul da marca'],
  ['success', 'success-soft', 4.5, 'texto de sucesso'],
  ['warning', 'warning-soft', 4.5, 'texto de aviso'],
  ['error', 'error-soft', 4.5, 'texto de erro'],
  ['error', 'surface', 4.5, 'mensagem de erro sobre card'],
  ['credit-foreground', 'credit', 4.5, 'texto sobre a cor de crédito'],
  ['focus-ring', 'surface', 3, 'anel de foco sobre card'],
  ['focus-ring', 'background', 3, 'anel de foco sobre página'],
  ['border-strong', 'surface', 3, 'borda de campos de formulário'],
];

let failed = 0;
for (const [fg, bg, min, label] of pairs) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`✗ token ausente: ${!tokens[fg] ? fg : bg}`);
    failed++;
    continue;
  }
  const value = ratio(tokens[fg], tokens[bg]);
  const ok = value >= min;
  if (!ok) failed++;
  console.log(
    `${ok ? '✓' : '✗'} ${value.toFixed(2).padStart(5)}:1 (mín. ${min})  ${label}  [${fg} / ${bg}]`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} par(es) abaixo do mínimo WCAG AA.`);
  process.exit(1);
}
console.log('\nTodos os pares atendem WCAG 2.2 AA.');
