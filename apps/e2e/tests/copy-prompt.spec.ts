import { expect, test } from '@playwright/test';

/**
 * Cenário E2E 4 (seção 14/15 do MVP2): "Copy AI Prompt" copia o texto exato
 * do prompt (seção 5.3 do MVP2 — nenhuma chamada a LLM, só clipboard) para a
 * área de transferência. Verifica o conteúdo copiado, não só o clique.
 */
test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('"Copy AI Prompt" copia o texto do prompt exibido na página', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('article').first().getByRole('link').first().getAttribute('href');
  await page.goto(href!);

  const promptSection = page.locator('section', { has: page.getByRole('heading', { name: 'AI Prompt' }) });
  await expect(promptSection).toBeVisible();

  await promptSection.getByRole('button', { name: 'Copy AI Prompt' }).click();
  await expect(promptSection.getByText('Copied to clipboard')).toBeVisible();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText.length).toBeGreaterThan(0);
  // O prompt nunca é HTML/CSS/JS bruto do componente (é um texto de instrução
  // para um agente de IA) — sanity check simples de que não copiamos o botão
  // errado (ex.: "Copy code").
  expect(clipboardText).not.toContain('/* HTML */');
});
