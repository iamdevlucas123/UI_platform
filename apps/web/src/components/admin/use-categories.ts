'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CategoryDto } from '@uilib/shared';

import { browserApi, type ApiError } from '@/lib/api-client';

/**
 * Categorias reais para o `<select>` de `ComponentForm` (seção 5.4 do MVP2).
 * Não existe `GET /api/admin/components/categories` — `GET /api/categories`
 * (público, sem token) já basta, mesmo critério já usado por `browserApi`
 * para a futura tela de categorias.
 */
export function useCategories(): UseQueryResult<CategoryDto[], ApiError> {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await browserApi.getCategories();
      return data;
    },
  });
}
