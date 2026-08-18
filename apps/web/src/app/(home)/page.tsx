import type { CategoryDto, ComponentListItemDto, PaginationMeta } from '@uilib/shared';
import { Suspense } from 'react';

import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { CategoryNav } from '@/components/catalog/CategoryNav';
import { SearchBar, SearchBarSkeleton } from '@/components/catalog/SearchBar';
import { SortToggle } from '@/components/catalog/SortToggle';
import { ApiError, serverApi } from '@/lib/api-client';
import { parseCatalogQuery, toURLSearchParams } from '@/lib/catalog-url';

/**
 * `/` — biblioteca pública (seção 5.1/7 do MVP2).
 *
 * Ler `searchParams` é uma "Dynamic API" do App Router: o próprio Next.js
 * já trata qualquer acesso a `searchParams` como request-time rendering
 * (é assim, sem flags experimentais, que "usar uma rota dinâmica quando
 * houver busca" evita tentar pré-renderizar combinações infinitas de
 * `?q=`/`?category=`/`?sort=`/`?page=` — não há como (nem por quê) gerar
 * essas páginas estaticamente).
 *
 * O cache "ISR revalidate: 300, tag components" da seção 7 continua
 * existindo, só que num nível diferente: não é o HTML da rota que fica em
 * cache (isso exigiria Partial Prerendering, fora do escopo desta etapa),
 * e sim a resposta do `fetch` para `GET /api/components` — via `next:
 * {revalidate: 300, tags: ['components']}` passado a `serverApi.getComponents`
 * logo abaixo. Isso preserva a intenção real da seção 7 (poupar a API de
 * tráfego repetido, permitir invalidação via `revalidateTag('components')`)
 * mesmo com o HTML sendo montado a cada request. A busca (`q` presente)
 * pula esse cache — "combinações infinitas; não vale cachear".
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentSearchParams = toURLSearchParams(resolvedSearchParams);
  const query = parseCatalogQuery(currentSearchParams);

  const categories = await fetchCategoriesSafely();

  let data: ComponentListItemDto[] | null = null;
  let meta: PaginationMeta | null = null;
  let hasError = false;

  try {
    const response = await serverApi.getComponents(
      query,
      query.q ? { revalidate: 0 } : { revalidate: 300, tags: ['components'] },
    );
    data = response.data;
    meta = response.meta;
  } catch (error) {
    hasError = true;
    if (!(error instanceof ApiError)) {
      throw error;
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900">Component library</h1>
        <p className="text-sm text-neutral-500">
          Browse UI components, preview them live, and copy the code or an AI prompt.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<SearchBarSkeleton />}>
          <SearchBar />
        </Suspense>
        <SortToggle sort={query.sort} currentSearchParams={currentSearchParams} />
      </div>

      <CategoryNav
        categories={categories}
        currentSearchParams={currentSearchParams}
        activeCategory={query.category}
      />

      <CatalogGrid
        data={data}
        meta={meta}
        error={hasError}
        currentSearchParams={currentSearchParams}
        hasActiveFilters={Boolean(query.q || query.category)}
      />
    </main>
  );
}

async function fetchCategoriesSafely(): Promise<CategoryDto[]> {
  try {
    const response = await serverApi.getCategories({ revalidate: 300, tags: ['components'] });
    return response.data;
  } catch {
    // Categorias são secundárias à listagem — falhar aqui não deve
    // derrubar a página inteira, só reduz o CategoryNav a "All".
    return [];
  }
}
