'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { ADMIN_QUERY_KEY_PREFIX } from '@/components/admin/use-admin-components';
import { toast, Toaster } from '@/components/ui/toast';

/** Reaproveitado por telas que também precisam evitar duplicar o toast/redirect globais deste arquivo (ex.: `DeleteComponentDialog`, `ComponentForm`). */
export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Provider de TanStack Query (seção 3 do MVP2) **limitado à área
 * administrativa** — montado só em `app/admin/layout.tsx`, nunca no layout
 * raiz, porque as páginas públicas usam ISR/Server Components e não têm
 * estado de servidor no cliente (seção 7).
 *
 * O tratamento de 401/403 é centralizado aqui — tanto em `QueryCache`
 * (listagens/dashboard) quanto em `MutationCache` (criar/editar/excluir no
 * `ComponentForm`), em vez de duplicado em cada tela. Um erro passando por
 * aqui continua propagando normalmente para o `onError`/`error` de quem
 * chamou (este `onError` de cache é um canal *adicional*, não substitui o
 * local) — 409/422, por exemplo, seguem intactos para o formulário mapear
 * em campos específicos; só 401/403 (sem `details` de campo, nunca teriam
 * o que mapear) disparam a ação global abaixo: limpa o cache de dados admin,
 * mostra um toast sem detalhes do token e força um reload completo para
 * `/sign-in` — não usa `router.push` porque queremos o Clerk remontar do
 * zero, não uma transição client-side que poderia reter estado da sessão
 * inválida.
 */
export function AdminProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    // `let` (não `const`) de propósito: `handleAuthError` precisa referenciar
    // o client para limpar o cache, mas o client só existe depois de
    // construído com `handleAuthError` já como callback — só funciona porque
    // os `onError` só são chamados bem depois, quando `client` já foi
    // atribuído (closure sobre a binding, não sobre o valor no momento da
    // declaração). ESLint não enxerga essa atribuição diferida.
    // eslint-disable-next-line prefer-const
    let client: QueryClient;

    function handleAuthError(error: unknown): void {
      if (!isAuthError(error)) {
        return;
      }

      client.removeQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });

      toast({
        variant: 'destructive',
        title: error.status === 401 ? 'Session expired' : 'Access denied',
        description:
          error.status === 401
            ? 'Please sign in again to continue.'
            : 'Your account no longer has admin access.',
      });

      window.location.assign('/sign-in');
    }

    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
      queryCache: new QueryCache({ onError: handleAuthError }),
      mutationCache: new MutationCache({ onError: handleAuthError }),
    });

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
