import { expect, test } from '@playwright/test';

/**
 * Cenário E2E 5 (seção 14/15 do MVP2): login administrativo via Clerk,
 * criação de um componente e aparecimento na área pública depois da
 * revalidação (seção 7 do MVP2).
 *
 * Dublê seguro para o login: não existe (nem deveria existir — seção 9 do
 * MVP2) nenhuma forma de "logar como admin" sem passar pelo Clerk de
 * verdade, então este cenário só roda com um usuário real de teste do
 * Clerk (instância de desenvolvimento), nunca com segredo/senha
 * hardcoded no repositório. Sem as variáveis abaixo, o teste é pulado com
 * um motivo explícito — não mascarado como "passou".
 *
 * Variáveis necessárias (nunca commitadas — exporte no shell ou num `.env`
 * local ignorado pelo Git antes de rodar):
 *   E2E_ADMIN_EMAIL    — email de um usuário Clerk (instância de teste) com
 *                        publicMetadata.role = "admin"
 *   E2E_ADMIN_PASSWORD — senha desse mesmo usuário
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(
  !ADMIN_EMAIL || !ADMIN_PASSWORD,
  'Requer E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD (usuário admin real de uma instância Clerk de teste) — ' +
    'não disponíveis neste ambiente. Ver comentário no topo deste arquivo.',
);

test('login admin, cria um componente publicado e ele aparece no catálogo público', async ({ page }) => {
  const uniqueName = `E2E Test Component ${Date.now()}`;
  const expectedSlug = uniqueName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // 1. Login via Clerk (seção 9 do MVP2) — formulário real, sem atalho.
  await page.goto('/sign-in');
  await page.locator('input[name="identifier"]').fill(ADMIN_EMAIL!);
  await page.locator('input[name="password"]').fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Continue' }).click();

  // `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin` — redireciona sozinho.
  await page.waitForURL('**/admin', { timeout: 20_000 });

  // 2. Cria um componente já PUBLISHED (ComponentForm, seção 5.4 do MVP2).
  await page.goto('/admin/components/new');
  await page.getByLabel('Name').fill(uniqueName);
  await page
    .getByLabel('Description')
    .fill('Component created by the MVP2 E2E suite — safe to delete.');
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('HTML').fill('<button class="e2e-btn">E2E</button>');
  await page.getByLabel('CSS').fill('.e2e-btn { color: hotpink; }');
  await page.getByLabel('Status').selectOption('PUBLISHED');

  await page.getByRole('button', { name: 'Create component' }).click();
  await expect(page).toHaveURL(/\/admin\/components\/.+\/edit$/, { timeout: 15_000 });
  await expect(page.getByText('Component created')).toBeVisible();

  try {
    // 3. Aparece na área pública depois da revalidação (seção 7 do MVP2:
    // best-effort, quase instantâneo — não é ISR de 300s). Um pequeno
    // retry absorve a corrida entre a revalidação e este `goto`.
    await expect(async () => {
      await page.goto(`/component/${expectedSlug}`);
      await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible();
    }).toPass({ timeout: 15_000 });
  } finally {
    // 4. Limpeza: não deixa dado de teste na base real (mesmo dev/test).
    await page.goto('/admin/components');
    await page.getByLabel('Search components by name…').fill(uniqueName);
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.waitForURL('**/admin/components');
  }
});
