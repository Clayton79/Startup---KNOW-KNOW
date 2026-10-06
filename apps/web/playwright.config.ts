import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { E2E } from './e2e/env';

const apiDir = path.resolve(import.meta.dirname, '../api');

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // O banco é compartilhado e o fluxo é sequencial: um worker por vez.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: E2E.webUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive.spec.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: [
    {
      // API compilada (rode `pnpm build` antes) apontando para o banco de e2e.
      command: 'node dist/main.js',
      cwd: apiDir,
      url: `${E2E.apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: E2E.apiEnv,
    },
    {
      command: `pnpm exec vite --port ${E2E.webPort} --strictPort`,
      cwd: import.meta.dirname,
      url: E2E.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: E2E.webEnv,
    },
  ],
});
