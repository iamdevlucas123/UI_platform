import { defineConfig, devices } from '@playwright/test';

/**
 * E2E do MVP2 (seção 14/15 do MVP2): roda contra uma instância real do site
 * (`web`) + API (`api`) + banco, já no ar — via `docker compose up -d` (ver
 * `apps/e2e/README.md`) ou `pnpm --filter @uilib/web dev` +
 * `pnpm --filter @uilib/api dev` em terminais separados. Não gerencia o
 * start/stop do stack: subir três serviços (banco, migrations/seed, API,
 * Next.js) dentro do `webServer` do Playwright tornaria o primeiro run
 * lento/imprevisível e dificultaria diagnosticar se uma falha é do stack ou
 * do teste — mais simples e mais claro como duas etapas explícitas.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
