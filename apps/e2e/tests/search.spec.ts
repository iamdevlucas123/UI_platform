import { expect, test } from '@playwright/test';

/**
 * Cenário E2E 2 (seção 14/15 do MVP2): busca filtra resultados, com debounce
 * de 300ms e estado refletido em `?q=` (seção 5.1 do MVP2). Não assume nomes
 * fixos de seed — pega o nome do primeiro card real e busca por um pedaço
 * dele, então continua válido mesmo se o seed mudar.
 */
test('busca por um termo do primeiro card filtra o grid e atualiza a URL', async ({ page }) => {
  await page.goto('/');

  const cards = page.locator('article');
  await expect(cards.first()).toBeVisible();
  const countBefore = await cards.count();

  const firstCardName = (await cards.first().locator('h3').innerText()).trim();
  // Primeira palavra do nome — termo curto o bastante para casar com o próprio card,
  // específico o bastante para não depender de nenhum nome fixo de seed.
  const searchTerm = firstCardName.split(/[\s—]/)[0]!;

  await page.getByLabel('Search components by name or description').fill(searchTerm);

  // Debounce de 300ms (seção 5.1) — a URL só reflete `q` depois dele.
  await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(searchTerm)}`, 'i'), { timeout: 20_000 });

  await expect(cards.first()).toBeVisible();
  const namesAfter = await page.locator('article h3').allInnerTexts();
  expect(namesAfter.length).toBeGreaterThan(0);
  expect(namesAfter.length).toBeLessThanOrEqual(countBefore);
  for (const name of namesAfter) {
    expect(name.toLowerCase()).toContain(searchTerm.toLowerCase());
  }
});

test('busca por um termo sem nenhuma correspondência mostra o estado vazio', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();

  const nonsenseTerm = 'zzzzzznonexistentcomponentzzzzzz';
  await page.getByLabel('Search components by name or description').fill(nonsenseTerm);

  await expect(page).toHaveURL(new RegExp(`[?&]q=${nonsenseTerm}`, 'i'), { timeout: 20_000 });
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByText(/no components match/i)).toBeVisible();
});
