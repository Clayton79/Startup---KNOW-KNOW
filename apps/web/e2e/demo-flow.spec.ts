import { expect, test } from '@playwright/test';
import { makeSessionPast, query, walletOf } from './support/db';
import { expectToast, login, logout } from './support/helpers';
import { DEMO_USERS, mockSupabase } from './support/mock-supabase';

/**
 * O fluxo da banca (docs/roteiro-da-banca.md), do cadastro à avaliação, no navegador de verdade,
 * contra a API e o banco reais. Só o Supabase Auth é simulado.
 */
test('criar conta → ensinar Java → aprender inglês → pedir aula → aceitar → concluir → avaliar → saldo', async ({
  page,
}) => {
  await mockSupabase(page);

  // 1. Cadastro
  await page.goto('/cadastro');
  await page.getByLabel(/^Como podemos te chamar/).fill('Clayton');
  await page.getByLabel(/^E-mail/).fill('clayton@example.com');
  await page.getByLabel(/^Senha/).fill('SenhaForte123');
  await page.getByLabel(/Li e aceito os/).check();
  await page.getByRole('button', { name: 'Criar conta' }).click();

  // 2. Onboarding: sobre mim → ensino Java → quero aprender inglês → horários (pulo)
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Conte um pouco sobre você' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'O que você sabe ensinar?' })).toBeVisible();
  await page.getByLabel(/Buscar conhecimentos que você ensina/).fill('Java');
  await page.getByRole('button', { name: 'Java', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(
    page.getByRole('heading', { name: 'O que você gostaria de aprender?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Inglês', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(
    page.getByRole('heading', { name: 'Quando você costuma estar disponível?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pular e concluir' }).click();

  await expect(page.getByRole('heading', { name: 'Perfil concluído' })).toBeVisible();
  await page.getByRole('link', { name: 'Ir para o painel' }).click();

  // 3. Painel: saldo de boas-vindas e recomendação "match excelente" com a Ana
  await expect(page.getByRole('heading', { name: /Olá, Clayton/ })).toBeVisible();
  await expect(page.getByText('20 créditos', { exact: false }).first()).toBeVisible();
  const anaCard = page.getByRole('article', { name: 'Ana Ribeiro ensina Inglês' });
  await expect(anaCard).toBeVisible();
  await expect(anaCard.getByText('Match excelente')).toBeVisible();
  await expect(anaCard.getByText('Vocês podem aprender um com o outro.')).toBeVisible();

  // 4. Explorar → perfil → solicitar aula
  await page.getByRole('link', { name: 'Explorar' }).first().click();
  await page.getByLabel('Buscar por conhecimento ou pessoa').fill('inglês');
  await expect(page.getByRole('article', { name: 'Ana Ribeiro ensina Inglês' })).toBeVisible();
  await page.getByRole('link', { name: 'Ana Ribeiro' }).first().click();
  await expect(page.getByRole('heading', { name: 'Ana Ribeiro', level: 1 })).toBeVisible();
  await expect(
    page.getByText('Ensina o que você quer aprender').or(page.getByText('Sabe ensinar')),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Solicitar aula' }).click();
  const dialog = page.getByRole('dialog', { name: /Solicitar aula com Ana Ribeiro/ });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('group', { name: 'Escolha o horário' })
    .getByRole('button')
    .first()
    .click();
  await expect(dialog.locator('p', { hasText: 'Custo:' })).toContainText('10 créditos');
  await dialog.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expectToast(page, 'Solicitação enviada.');
  await expect(page).toHaveURL(/\/aulas\/[0-9a-f-]{36}/);
  const sessionUrl = page.url();
  const sessionId = sessionUrl.split('/').pop() as string;
  await expect(page.getByText('Aguardando a resposta de Ana Ribeiro')).toBeVisible();

  // Os créditos ficaram reservados (escrow), ainda não foram transferidos.
  expect(await walletOf('Clayton')).toEqual({ balance: 20, held: 10 });

  // 5. A Ana aceita
  await logout(page);
  await login(page, DEMO_USERS.ana!.email);
  await page.goto(sessionUrl);
  await expect(page.getByText('Clayton gostaria de aprender Inglês com você.')).toBeVisible();
  await page.getByRole('button', { name: 'Aceitar', exact: true }).click();
  const accept = page.getByRole('dialog', { name: /Aceitar a aula de Inglês/ });
  await accept.getByLabel('Link da reunião').fill('https://meet.google.com/abc-defg-hij');
  await accept.getByRole('button', { name: 'Aceitar aula' }).click();
  await expectToast(page, 'Aula aceita.');
  await expect(page.getByText('Tudo certo! A aula está confirmada.')).toBeVisible();

  // 6. O tempo passa: a aula terminou. As duas pessoas confirmam.
  await makeSessionPast(sessionId);
  await page.reload();
  await expect(page.getByText(/A aula terminou/)).toBeVisible();
  await page.getByRole('button', { name: 'Essa aula aconteceu?' }).click();
  await page.getByRole('button', { name: 'Sim, aconteceu' }).click();
  await expectToast(page, 'Resposta registrada.');
  await expect(page.getByText('Você já respondeu. Aguardando Clayton.')).toBeVisible();

  await logout(page);
  await login(page, 'clayton@example.com');
  await page.goto(sessionUrl);
  await page.getByRole('button', { name: 'Essa aula aconteceu?' }).click();
  await page.getByRole('button', { name: 'Sim, aconteceu' }).click();
  await expectToast(page, 'Resposta registrada.');

  // 7. Créditos transferidos e aula concluída
  await expect(page.getByText('Aula concluída. Você usou 10 créditos.')).toBeVisible();
  expect(await walletOf('Clayton')).toEqual({ balance: 10, held: 0 });
  expect(await walletOf('Ana Ribeiro')).toEqual({ balance: 30, held: 10 }); // 10 ainda reservados para a aula de Java dela

  // 8. Avaliação
  await page.getByRole('button', { name: 'Avaliar Ana Ribeiro' }).click();
  const review = page.getByRole('dialog', { name: /Avalie Ana Ribeiro/ });
  for (const criterion of ['Didática (explica bem?)', 'Conhecimento do assunto', 'Pontualidade']) {
    await review
      .getByRole('group', { name: criterion })
      .getByRole('radio', { name: /^5 de 5/ })
      .check({ force: true });
  }
  await review.getByLabel(/Comentário/).fill('Aula excelente, aprendi muito!');
  await review.getByRole('button', { name: 'Enviar avaliação' }).click();
  await expectToast(page, 'Avaliação enviada. Obrigado!');
  await expect(page.getByRole('button', { name: 'Avaliar Ana Ribeiro' })).toBeHidden();

  // 9. Novo saldo e histórico
  await page.getByRole('link', { name: 'Carteira' }).first().click();
  await expect(page.getByRole('heading', { name: 'Carteira' })).toBeVisible();
  await expect(
    page.getByText('Disponível para usar').locator('..').getByText('10', { exact: true }),
  ).toBeVisible();
  const history = page.getByRole('list').filter({ hasText: 'Créditos de boas-vindas' });
  await expect(history.getByText('Aula de Inglês')).toBeVisible();
  await expect(history.getByText('Créditos de boas-vindas')).toBeVisible();

  // 10. A reputação da Ana foi atualizada ("média · quantidade de avaliações")
  const [ana] = await query<{ mentor_rating_sum: number; mentor_rating_count: number }>(
    `SELECT mentor_rating_sum, mentor_rating_count FROM profiles WHERE display_name = 'Ana Ribeiro'`,
  );
  expect(ana?.mentor_rating_count).toBe(2); // 1 da demonstração + a do Clayton
});

test('login com senha errada mostra mensagem humana e mantém o e-mail digitado', async ({
  page,
}) => {
  const supabase = await mockSupabase(page);
  supabase.failNextLogin();

  await page.goto('/login');
  await page.getByLabel(/^E-mail/).fill(DEMO_USERS.lucas!.email);
  await page.getByLabel(/^Senha/).fill('errada123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(
    page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^E-mail/)).toHaveValue(DEMO_USERS.lucas!.email);
  await expect(page).toHaveURL(/\/login/);
});

test('rotas privadas redirecionam para o login e voltam depois de entrar', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/carteira');
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/^E-mail/).fill(DEMO_USERS.lucas!.email);
  await page.getByLabel(/^Senha/).fill('uma-senha-qualquer1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/carteira/);
  await expect(page.getByRole('heading', { name: 'Carteira' })).toBeVisible();
});

test('painel da Lucas já nasce com dados de demonstração (nada de tela vazia)', async ({
  page,
}) => {
  await mockSupabase(page);
  await login(page, DEMO_USERS.lucas!.email);

  await expect(page.getByRole('heading', { name: /Olá, Lucas/ })).toBeVisible();
  await expect(page.getByText(/Inglês com Ana/).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pessoas que podem ensinar o que você procura' }),
  ).toBeVisible();
});

test('usuário comum não acessa o admin; admin acessa', async ({ page }) => {
  await mockSupabase(page);
  await login(page, DEMO_USERS.lucas!.email);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard/);
  await logout(page);

  await login(page, DEMO_USERS.admin!.email);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible();
  await expect(page.getByText('Créditos em circulação')).toBeVisible();
});
