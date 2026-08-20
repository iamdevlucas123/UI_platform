import { expect, test } from '@playwright/test';

/**
 * Cenário E2E 1 (seção 14/15 do MVP2): a home carrega e mostra cards reais,
 * contra a API de verdade (não mock) — precisa do stack completo no ar
 * (`docker compose up -d`, ver `apps/e2e/README.md`), com o `seed` do
 * banco já aplicado (é o `command` do serviço `api` que garante isso).
 */
test.describe('Home (cenário E2E 1)', () => {
  test('carrega e mostra ao menos um card de componente', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Component library' })).toBeVisible();

    const cards = page.locator('article');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    // Cada card é um link nomeado para /component/[slug] (seção 5.1 do MVP2).
    const firstCardLink = cards.first().getByRole('link').first();
    await expect(firstCardLink).toHaveAttribute('href', /^\/component\//);
  });

  test('mostra a navegação de categorias com pelo menos uma categoria real', async ({ page }) => {
    await page.goto('/');

    const categoryNav = page.getByRole('navigation', { name: 'Filter by category' });
    await expect(categoryNav).toBeVisible();
    // "All" + ao menos uma categoria semeada (seção 1 do MVP2: 14 categorias iniciais).
    expect(await categoryNav.getByRole('link').count()).toBeGreaterThan(1);
  });
});
