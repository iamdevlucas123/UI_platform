import { expect, test } from '@playwright/test';

/**
 * Cenário E2E 3 (seção 14/15 do MVP2): a página de detalhe renderiza o
 * preview funcional num iframe sandboxed (seção 8/11 do MVP2 — sem
 * `allow-same-origin`) e "Copy Code" copia HTML+CSS+JS de verdade para a
 * área de transferência (não só o clique — o conteúdo copiado, seção 9 do
 * briefing).
 */
test.describe('Detalhe do componente (cenário E2E 3)', () => {
  test.beforeEach(async ({ context }) => {
    // Permissão explícita do navegador para ler a área de transferência de
    // volta (Chromium exige isso para `navigator.clipboard.readText()`,
    // mesmo dentro de um teste) — sem isso o assert do conteúdo copiado não
    // teria como verificar nada além do clique.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('renderiza o preview em iframe sandboxed, sem allow-same-origin', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('article').first().getByRole('link').first().getAttribute('href');
    await page.goto(href!);

    const iframe = page.getByTitle('Live component preview');
    await expect(iframe).toBeVisible();

    const sandbox = await iframe.getAttribute('sandbox');
    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  test('"Copy code" copia HTML/CSS/JS reais para a área de transferência', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('article').first().getByRole('link').first().getAttribute('href');
    await page.goto(href!);

    await page.getByRole('button', { name: 'Copy code' }).click();
    await expect(page.getByText('Copied to clipboard')).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/* HTML */');
    expect(clipboardText.length).toBeGreaterThan(0);

    // O texto copiado precisa bater com o que está de fato na aba HTML — não
    // só "algo foi copiado", mas o código certo. A aba HTML já é a ativa por
    // padrão (`CodeTabsClient`); escopar ao `tabpanel` visível evita pegar
    // o `<pre><code>` das outras abas, escondidas via `hidden`.
    const htmlCode = (await page.locator('[role="tabpanel"]:not([hidden]) pre code').innerText()).trim();
    const firstHtmlLine = htmlCode.split('\n')[0]!;
    expect(clipboardText).toContain(firstHtmlLine);
  });
});
