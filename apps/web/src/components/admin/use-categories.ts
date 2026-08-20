'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CategoryDto } from '@uilib/shared';

import { browserApi, type ApiError } from '@/lib/api-client';

/** Exportada para que `use-category-mutations.ts` invalide exatamente esta query, sem duplicar a chave literal em dois arquivos. */
export const CATEGORIES_QUERY_KEY = ['categories'] as const;

/**
 * Categorias reais para o `<select>` de `ComponentForm` e para a listagem de
 * `/admin/categories` (seção 5.4 do MVP2). Não existe `GET
 * /api/admin/components/categories` nem `GET /api/admin/categories` — `GET
 * /api/categories` (público, sem token) já basta para as duas telas.
 */
export function useCategories(): UseQueryResult<CategoryDto[], ApiError> {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await browserApi.getCategories();
      return data;
    },
  });
}
