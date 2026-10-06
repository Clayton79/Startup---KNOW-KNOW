import { expect, type Page } from '@playwright/test';

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/^E-mail/).fill(email);
  await page.getByLabel(/^Senha/).fill('uma-senha-qualquer1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/');
}

/** Espera o aviso (toast) com o texto e garante que ele apareceu. */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}
