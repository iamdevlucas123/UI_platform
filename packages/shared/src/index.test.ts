import { describe, expect, it } from 'vitest';
import { SHARED_PACKAGE_NAME } from './index.js';

// Teste de fumaça: confirma que o pipeline de testes do workspace (Vitest)
// está corretamente configurado nesta etapa de fundação do monorepo.
describe('@uilib/shared', () => {
  it('expõe o nome do pacote', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@uilib/shared');
  });
});
