import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/api/src/generated/**',
      '.local/**',
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // API (Node + decorators do Nest: o `consistent-type-imports` quebraria a injeção de dependências)
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['apps/api/**/*.{spec,e2e-spec}.ts', 'apps/api/test/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['apps/api/prisma/seed.ts', 'apps/api/prisma.config.ts'],
    rules: { 'no-console': 'off' },
  },

  // Web
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
    },
  },

  // Scripts e configs JS: sem lint tipado (não fazem parte de nenhum tsconfig)
  { files: ['**/*.{mjs,cjs,js}'], extends: [tseslint.configs.disableTypeChecked] },

  // Scripts e configs em Node
  {
    files: [
      '**/*.mjs',
      '**/*.cjs',
      '**/*.js',
      'apps/web/vite.config.ts',
      'apps/web/playwright.config.ts',
    ],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  prettier,
);
