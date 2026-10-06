import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { login } from './support/helpers';
import { DEMO_USERS, mockSupabase } from './support/mock-supabase';

/** Regras WCAG 2.2 AA que o axe consegue verificar automaticamente. */
async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map((violation) => ({
    regra: violation.id,
    impacto: violation.impact,
    elementos: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
}

test.describe('acessibilidade: páginas públicas', () => {
  for (const [name, path] of [
    ['landing', '/'],
    ['como funciona', '/como-funciona'],
    ['login', '/login'],
    ['cadastro', '/cadastro'],
    ['recuperar senha', '/esqueci-minha-senha'],
    ['explorar', '/explorar'],
    ['privacidade', '/privacidade'],
    ['termos', '/termos'],
    ['404', '/nao-existe'],
  ] as const) {
    test(name, async ({ page }) => {
      await mockSupabase(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expectAccessible(page);
    });
  }
});

test.describe('acessibilidade: app logado', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
    await login(page, DEMO_USERS.lucas!.email);
  });

  for (const [name, path] of [
    ['painel', '/dashboard'],
    ['perfil', '/perfil'],
    ['editar perfil', '/perfil/editar'],
    ['aulas', '/aulas'],
    ['agenda', '/agenda'],
    ['carteira', '/carteira'],
    ['avaliações', '/avaliacoes'],
    ['notificações', '/notificacoes'],
    ['configurações', '/configuracoes'],
    ['explorar logado', '/explorar'],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      // Espera os dados carregarem (esqueletos somem) antes de varrer.
      await page.waitForLoadState('networkidle');
      await expectAccessible(page);
    });
  }

  test('diálogo de solicitação de aula', async ({ page }) => {
    await page.goto('/explorar');
    await page.getByLabel('Buscar por conhecimento ou pessoa').fill('java');
    await page
      .getByRole('article', { name: 'Rafael Moreira ensina Java' })
      .getByRole('button', { name: 'Solicitar aula' })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectAccessible(page);
  });

  test('navegação por teclado: foco visível e Esc fecha o diálogo', async ({ page }) => {
    await page.goto('/explorar');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();

    await page.getByLabel('Buscar por conhecimento ou pessoa').fill('java');
    const button = page
      .getByRole('article', { name: 'Rafael Moreira ensina Java' })
      .getByRole('button', { name: 'Solicitar aula' });
    await button.focus();
    const outline = await button.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(button).toBeFocused();
  });
});
