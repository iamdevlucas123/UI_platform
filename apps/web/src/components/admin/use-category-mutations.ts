'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@uilib/shared';

import { adminApi, ApiError } from '@/lib/api-client';

import { ADMIN_QUERY_KEY_PREFIX } from './use-admin-components';
import { CATEGORIES_QUERY_KEY } from './use-categories';

async function requireToken(getToken: () => Promise<string | null>): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'No active session');
  }
  return token;
}

/**
 * Invalida tanto `CATEGORIES_QUERY_KEY` (usado pelo `<select>` de categoria
 * em `ComponentForm` e pela própria listagem admin) quanto
 * `ADMIN_QUERY_KEY_PREFIX` (dashboard/listagem de componentes, que embutem o
 * nome da categoria em cada linha) — mesmo critério de
 * `use-component-mutations.ts`.
 */
function invalidateCategoryQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY_PREFIX });
}

/** `POST /api/admin/categories` (seção 4/5.4 do MVP2). */
export function useCreateCategory(): UseMutationResult<CategoryDto, ApiError, CreateCategoryInput> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const token = await requireToken(getToken);
      const { data } = await adminApi.createCategory(input, token);
      return data;
    },
    onSuccess: () => invalidateCategoryQueries(queryClient),
  });
}

export interface UpdateCategoryVariables {
  id: string;
  input: UpdateCategoryInput;
}

/** `PUT /api/admin/categories/:id` (seção 4/5.4 do MVP2). */
export function useUpdateCategory(): UseMutationResult<CategoryDto, ApiError, UpdateCategoryVariables> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateCategoryVariables) => {
      const token = await requireToken(getToken);
      const { data } = await adminApi.updateCategory(id, input, token);
      return data;
    },
    onSuccess: () => invalidateCategoryQueries(queryClient),
  });
}

/**
 * `DELETE /api/admin/categories/:id` (seção 4/5.4 do MVP2). Em `409
 * CATEGORY_IN_USE` a API não altera nada — a query permanece válida, então
 * não há necessidade (nem correção) de invalidar em erro; só o `onSuccess`
 * invalida.
 */
export function useDeleteCategory(): UseMutationResult<void, ApiError, string> {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await requireToken(getToken);
      await adminApi.deleteCategory(id, token);
    },
    onSuccess: () => invalidateCategoryQueries(queryClient),
  });
}
