import type { ComponentListItemDto } from '@uilib/shared';

import { serverApi, type NextFetchOptions } from './api-client';

const COMPONENTS_LIST_PAGE_SIZE = 48;

/**
 * Todos os componentes publicados, paginando `GET /api/components` até
 * `meta.totalPages` — o endpoint só devolve `PUBLISHED` (seção 7 do MVP1),
 * então um DRAFT nunca aparece aqui. Reaproveitado por
 * `generateStaticParams` de `/component/[slug]` e por `sitemap.ts` (seção
 * 7 do MVP2) — os dois precisam exatamente da mesma lista completa.
 */
export async function fetchAllPublishedComponents(next: NextFetchOptions): Promise<ComponentListItemDto[]> {
  const items: ComponentListItemDto[] = [];
  let page = 1;

  for (;;) {
    const response = await serverApi.getComponents({ page, limit: COMPONENTS_LIST_PAGE_SIZE }, next);
    items.push(...response.data);

    if (response.data.length === 0 || page >= response.meta.totalPages) {
      break;
    }
    page += 1;
  }

  return items;
}
