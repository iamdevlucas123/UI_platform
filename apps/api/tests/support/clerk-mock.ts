/**
 * Fixture compartilhada de `verifyToken` (`@clerk/backend`) para os testes
 * de integração de `/api/admin/*` (seção 9 do MVP2, seção 13 do MVP1: sem
 * depender de rede real do Clerk). O `verifyToken` real (export da raiz do
 * pacote) lança em token inválido — por isso este mock rejeita em vez de
 * devolver `{errors}`, espelhando o comportamento real. O nome começa com
 * `mock` de propósito — é a convenção que o Vitest exige para permitir
 * referenciar uma import dentro do factory de `vi.mock` (que é hoisted
 * para o topo do arquivo).
 */
export const ADMIN_BEARER_TOKEN = 'valid-admin-jwt';
export const NON_ADMIN_BEARER_TOKEN = 'valid-non-admin-jwt';

export async function mockVerifyToken(token: string) {
  if (token === ADMIN_BEARER_TOKEN) {
    return { sub: 'user_test_admin', email: 'admin@dev.local', metadata: { role: 'admin' } };
  }
  if (token === NON_ADMIN_BEARER_TOKEN) {
    return { sub: 'user_test_member', email: 'member@dev.local', metadata: {} };
  }
  throw new Error('invalid token');
}
