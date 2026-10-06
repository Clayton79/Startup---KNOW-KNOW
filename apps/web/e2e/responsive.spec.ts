import { expect, test, type Page } from '@playwright/test';
import { login } from './support/helpers';
import { DEMO_USERS, mockSupabase } from './support/mock-supabase';

/** A página nunca deve rolar para os lados no celular. */
async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'a página rolou na horizontal').toBeLessThanOrEqual(1);
}

test.describe('celular (Pixel 7)', () => {
  test('landing: sem rolagem lateral e menu funciona só com toque, sem hover', async ({ page }) => {
    await page.goto('/');
    await expectNoHorizontalScroll(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Aprenda o que quiser');
    await page.getByRole('button', { name: 'Abrir menu' }).tap();
    const menu = page.getByRole('dialog');
    await expect(menu.getByRole('link', { name: 'Explorar conhecimentos' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await page.getByRole('button', { name: 'Abrir menu' }).tap();
    await page.getByRole('dialog').getByRole('link', { name: 'Como funciona' }).tap();
    await expect(page).toHaveURL(/\/como-funciona/);
  });

  test('app logado: barra inferior no lugar da lateral e telas sem rolagem lateral', async ({
    page,
  }) => {
    await mockSupabase(page);
    await login(page, DEMO_USERS.lucas!.email);

    const bottomNav = page.getByRole('navigation', { name: 'Principal' });
    await expect(bottomNav).toBeVisible();
    for (const label of ['Início', 'Explorar', 'Aulas', 'Carteira', 'Perfil']) {
      await expect(bottomNav.getByRole('link', { name: label })).toBeVisible();
    }
    // Alvos de toque com pelo menos 44 px (WCAG 2.5.8 recomenda ≥ 24; usamos o padrão do iOS/Android).
    const box = await bottomNav.getByRole('link', { name: 'Aulas' }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    for (const path of [
      '/dashboard',
      '/explorar',
      '/aulas',
      '/carteira',
      '/perfil',
      '/perfil/editar',
      '/notificacoes',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test('solicitar aula no celular: o diálogo ocupa a tela e é utilizável', async ({ page }) => {
    await mockSupabase(page);
    await login(page, DEMO_USERS.ana!.email);
    await page.goto('/explorar');
    await page.getByLabel('Buscar por conhecimento ou pessoa').fill('java');
    await page
      .getByRole('article', { name: 'Rafael Moreira ensina Java' })
      .getByRole('button', { name: 'Solicitar aula' })
      .tap();

    const dialog = page.getByRole('dialog', { name: /Solicitar aula com Rafael Moreira/ });
    await expect(dialog).toBeVisible();
    const viewport = page.viewportSize();
    const box = await dialog.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(viewport!.width);
    await expect(dialog.getByRole('button', { name: 'Enviar solicitação' })).toBeDisabled(); // falta escolher horário
    await dialog
      .getByRole('group', { name: 'Escolha o horário' })
      .getByRole('button')
      .first()
      .tap();
    await expect(dialog.getByRole('button', { name: 'Enviar solicitação' })).toBeEnabled();
  });
});
