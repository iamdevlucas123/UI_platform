'use client';

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { ADMIN_QUERY_KEY_PREFIX } from '@/components/admin/use-admin-components';
import { toast, Toaster } from '@/components/ui/toast';

function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Provider de TanStack Query (seção 3 do MVP2) **limitado à área
 * administrativa** — montado só em `app/admin/layout.tsx`, nunca no layout
 * raiz, porque as páginas públicas usam ISR/Server Components e não têm
 * estado de servidor no cliente (seção 7).
 *
 * O tratamento de 401/403 é centralizado aqui, no `onError` do
 * `QueryCache`, em vez de duplicado em cada tela que usa `useQuery` — é o
 * único lugar por onde toda chamada administrativa passa. Em qualquer erro
 * de autenticação/autorização: limpa o cache de dados admin (nunca deixa
 * uma resposta anterior "vazar" depois da sessão cair), mostra um toast sem
 * detalhes do token e força um reload completo para `/sign-in` — não usa
 * `router.push` porque queremos o Clerk remontar do zero, não uma
 * transição client-side que poderia reter estado da sessão inválida.
 */
export function AdminProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
        queryCache: new QueryCache({
          onError: (error) => {
            if (!isAuthError(error)) {
              return;
            }

            queryClient.removeQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });

            toast({
              variant: 'destructive',
              title: error.status === 401 ? 'Session expired' : 'Access denied',
              description:
                error.status === 401
                  ? 'Please sign in again to continue.'
                  : 'Your account no longer has admin access.',
            });

            window.location.assign('/sign-in');
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
