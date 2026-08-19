'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { AdminComponentDto, CreateComponentInput, UpdateComponentInput } from '@uilib/shared';

import { adminApi, ApiError } from '@/lib/api-client';

import { ADMIN_QUERY_KEY_PREFIX } from './use-admin-components';

async function requireToken(getToken: () => Promise<string | null>): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No active session');
  }
  return token;
}

/**
 * `POST /api/admin/components` (seção 4/5.4 do MVP2). Igual a
 * `useAdminComponents`: o token vem de `getToken()` dentro de `mutationFn`,
 * nunca cacheado. Em sucesso, invalida toda query administrativa
 * (`ADMIN_QUERY_KEY_PREFIX`) — dashboard e listagem passam a refletir o
 * componente recém-criado no próximo render, sem refetch manual.
 */
export function useCreateComponent(): UseMutationResult<AdminComponentDto, ApiError, CreateComponentInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateComponentInput) => {
      const token = await requireToken(getToken);
      const { data } = await adminApi.createComponent(input, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });
    },
  });
}

export interface UpdateComponentVariables {
  id: string;
  input: UpdateComponentInput;
}

/** `PUT /api/admin/components/:id` (seção 4/5.4 do MVP2). Mesmo critério de `useCreateComponent`. */
export function useUpdateComponent(): UseMutationResult<
  AdminComponentDto,
  ApiError,
  UpdateComponentVariables
> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateComponentVariables) => {
      const token = await requireToken(getToken);
      const { data } = await adminApi.updateComponent(id, input, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });
    },
  });
}

/** `DELETE /api/admin/components/:id` (seção 4/5.4 do MVP2). Mesmo critério de `useCreateComponent`. */
export function useDeleteComponent(): UseMutationResult<void, ApiError, string> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await requireToken(getToken);
      await adminApi.deleteComponent(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });
    },
  });
}
