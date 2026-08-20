import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, clerkFrontendApiOrigin, generateNonce } from '../csp';

describe('clerkFrontendApiOrigin (seção 11 do MVP2)', () => {
  it('decodifica a Frontend API do Clerk a partir de uma publishable key de teste', () => {
    // Mesmo formato de `.env`: pk_test_<base64("<frontend-api>$")>.
    const key = 'pk_test_dmFzdC1lbGYtOTkwMC5jbGVyay5hY2NvdW50cy5kZXYk';

    expect(clerkFrontendApiOrigin(key)).toBe('https://vast-elf-9900.clerk.accounts.dev');
  });

  it('também decodifica uma publishable key de produção (prefixo pk_live_)', () => {
    const key = `pk_live_${btoa('clerk.example.com$')}`;

    expect(clerkFrontendApiOrigin(key)).toBe('https://clerk.example.com');
  });
});

describe('buildContentSecurityPolicy (seção 11 do MVP2)', () => {
  const BASE_INPUT = {
    nonce: 'test-nonce',
    clerkFrontendApiOrigin: 'https://vast-elf-9900.clerk.accounts.dev',
    apiOrigin: 'http://localhost:4000',
    allowUnsafeEval: false,
  };

  it('inclui exatamente as diretivas da seção 11: default-src, frame-src e img-src', () => {
    const csp = buildContentSecurityPolicy(BASE_INPUT);

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-src 'self' data:");
    expect(csp).toContain("img-src 'self' data: https:");
  });

  it('libera style-src para o highlight de código do Shiki (CodeBlockView usa style inline, não dangerouslySetInnerHTML)', () => {
    const csp = buildContentSecurityPolicy(BASE_INPUT);

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('libera worker-src para o Web Worker que o SDK do Clerk cria a partir de uma blob: URL', () => {
    const csp = buildContentSecurityPolicy(BASE_INPUT);

    expect(csp).toContain("worker-src 'self' blob:");
  });

  it('libera só o domínio do Clerk (e o nonce) em script-src — nenhum outro host', () => {
    const csp = buildContentSecurityPolicy(BASE_INPUT);
    const scriptSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'));

    expect(scriptSrc).toBe(
      "script-src 'self' 'nonce-test-nonce' https://vast-elf-9900.clerk.accounts.dev",
    );
  });

  it('nunca inclui unsafe-eval quando allowUnsafeEval é false (produção)', () => {
    const csp = buildContentSecurityPolicy({ ...BASE_INPUT, allowUnsafeEval: false });

    expect(csp).not.toContain('unsafe-eval');
  });

  it('inclui unsafe-eval só em script-src quando allowUnsafeEval é true (next dev — ver comentário em csp.ts)', () => {
    const csp = buildContentSecurityPolicy({ ...BASE_INPUT, allowUnsafeEval: true });
    const scriptSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'));

    expect(scriptSrc).toBe(
      "script-src 'self' 'nonce-test-nonce' https://vast-elf-9900.clerk.accounts.dev 'unsafe-eval'",
    );
    expect(csp).not.toMatch(/connect-src[^;]*unsafe-eval/);
  });

  it('libera o domínio do Clerk e a origem da API (seção 10: fetch direto do browser) em connect-src', () => {
    const csp = buildContentSecurityPolicy(BASE_INPUT);
    const connectSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src'));

    expect(connectSrc).toBe(
      "connect-src 'self' https://vast-elf-9900.clerk.accounts.dev http://localhost:4000",
    );
  });
});

describe('generateNonce (seção 11 do MVP2)', () => {
  it('gera um valor novo a cada chamada', () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });

  it('gera uma string base64 não vazia', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});
