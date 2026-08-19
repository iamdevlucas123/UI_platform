'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AdminComponentDto } from '@uilib/shared';

import { adminApi, ApiError } from '@/lib/api-client';

/** Prefixo de query key da área administrativa — usado também em `AdminProviders` para limpar o cache em 401/403 sem precisar duplicar a string em dois arquivos. */
export const ADMIN_QUERY_KEY_PREFIX = ['admin'] as const;

const ADMIN_COMPONENTS_QUERY_KEY = [...ADMIN_QUERY_KEY_PREFIX, 'components'] as const;

/**
 * `GET /api/admin/components` (seção 4/9 do MVP2) — única fonte de dados
 * administrativos de componentes, consumida tanto pelo dashboard quanto
 * pela listagem (`/admin/components`), para não espalhar `fetch` pelas
 * telas. O token é obtido de `getToken()` **dentro do `queryFn`**, ou seja,
 * a cada execução da query (inclusive refetch) — nunca cacheado — para que
 * uma sessão renovada nunca reuse um token expirado.
 */
export function useAdminComponents(): UseQueryResult<AdminComponentDto[], ApiError> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ADMIN_COMPONENTS_QUERY_KEY,
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new ApiError(401, 'UNAUTHORIZED', 'No active session');
      }
      const { data } = await adminApi.listComponents(token);
      return data;
    },
    // 401/403 nunca se resolvem com retry — só piora a latência até o
    // tratamento global (`AdminProviders`) redirecionar para /sign-in.
    retry: false,
  });
}

/** `GET /api/admin/components/:id` (seção 4/9 do MVP2) — carrega um componente pelo id para `/admin/components/[id]/edit`. Mesmo critério de token fresco por chamada de `useAdminComponents`. */
export function useAdminComponent(id: string): UseQueryResult<AdminComponentDto, ApiError> {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [...ADMIN_QUERY_KEY_PREFIX, 'components', id] as const,
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new ApiError(401, 'UNAUTHORIZED', 'No active session');
      }
      const { data } = await adminApi.getComponent(id, token);
      return data;
    },
    retry: false,
  });
}
