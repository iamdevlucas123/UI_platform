import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('@clerk/nextjs/server', () => ({ auth }));
vi.mock('next/navigation', () => ({ notFound }));

// Importado depois dos mocks acima, para pegar `@clerk/nextjs/server`/`next/navigation` já mockados.
const { default: AdminLayout } = await import('../layout');

/**
 * Guard de `/admin/*` (seção 9 do MVP2, fluxo 3): autenticação já é
 * garantida por `clerkMiddleware` (`middleware.ts`, testado à parte) —
 * este layout cobre só a AUTORIZAÇÃO por `role`. Uma sessão válida sem
 * `role: 'admin'` precisa cair em `notFound()`, nunca renderizar
 * `children` nem redirecionar (o que revelaria a existência da rota).
 */
describe('AdminLayout — autorização por role (seção 9 do MVP2)', () => {
  beforeEach(() => {
    auth.mockReset();
    notFound.mockClear();
  });

  it('chama notFound() quando a sessão não tem role admin', async () => {
    auth.mockResolvedValue({ sessionClaims: { metadata: { role: undefined } } });

    await expect(AdminLayout({ children: 'conteúdo admin' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('chama notFound() quando não há sessionClaims (sessão sem metadata customizada)', async () => {
    auth.mockResolvedValue({ sessionClaims: null });

    await expect(AdminLayout({ children: 'conteúdo admin' })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renderiza children sem chamar notFound() quando role é admin', async () => {
    auth.mockResolvedValue({ sessionClaims: { metadata: { role: 'admin' } } });

    const result = await AdminLayout({ children: 'conteúdo admin' });

    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
