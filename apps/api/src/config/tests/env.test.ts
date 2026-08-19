import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `config/env.ts` valida `process.env` como efeito colateral do import
 * (seção 12 do MVP1: falha no boot se faltar variável). Para testar os
 * dois caminhos, cada teste manipula `process.env` e reimporta o módulo
 * com `vi.resetModules()` — sem isso, o cache de módulos ES faria o
 * segundo `import` reaproveitar o resultado do primeiro.
 */
describe('config/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Os casos de falha logam via console.error antes de lançar; silenciamos
    // para manter a saída do teste limpa (o conteúdo não é o que é testado).
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('faz parse das sete variáveis válidas, incluindo CLERK_SECRET_KEY e REVALIDATE_SECRET', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.PORT = '5000';
    process.env.LOG_LEVEL = 'warn';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';

    const { env } = await import('../env.js');

    expect(env).toEqual({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public',
      WEB_ORIGIN: 'http://localhost:3000',
      PORT: 5000,
      LOG_LEVEL: 'warn',
      CLERK_SECRET_KEY: 'sk_test_secret',
      REVALIDATE_SECRET: 'revalidate-secret',
    });
  });

  it('aplica defaults de PORT (4000) e LOG_LEVEL (info) quando omitidos', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;

    const { env } = await import('../env.js');

    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('falha ao iniciar se CLERK_SECRET_KEY estiver ausente', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';
    delete process.env.CLERK_SECRET_KEY;

    await expect(import('../env.js')).rejects.toThrow('Invalid environment variables');
  });

  it('falha ao iniciar se CLERK_SECRET_KEY não começar com "sk_"', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.CLERK_SECRET_KEY = 'pk_test_wrong-prefix';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';

    await expect(import('../env.js')).rejects.toThrow('Invalid environment variables');
  });

  it('falha ao iniciar se REVALIDATE_SECRET estiver ausente', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    delete process.env.REVALIDATE_SECRET;

    await expect(import('../env.js')).rejects.toThrow('Invalid environment variables');
  });

  it('falha ao iniciar se DATABASE_URL não for uma URL válida', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'not-a-url';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';

    await expect(import('../env.js')).rejects.toThrow('Invalid environment variables');
  });

  it('falha ao iniciar se NODE_ENV estiver fora do enum', async () => {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    process.env.CLERK_SECRET_KEY = 'sk_test_secret';
    process.env.REVALIDATE_SECRET = 'revalidate-secret';

    await expect(import('../env.js')).rejects.toThrow('Invalid environment variables');
  });
});
