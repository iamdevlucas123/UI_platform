import { describe, expect, it } from 'vitest';

// Teste de fumaça: confirma que o pipeline de testes do workspace (Vitest)
// está corretamente configurado nesta etapa de fundação do monorepo.
describe('@uilib/api', () => {
  it('roda no ambiente de testes configurado', () => {
    expect(true).toBe(true);
  });
});
