import type { CategoryDto, ComponentListItemDto, PaginationMeta } from '@uilib/shared';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CatalogGrid } from '@/components/catalog/CatalogGrid';
import { CategoryNav } from '@/components/catalog/CategoryNav';
import { SearchBar, SearchBarSkeleton } from '@/components/catalog/SearchBar';
import { SortToggle } from '@/components/catalog/SortToggle';
import { ApiError, serverApi } from '@/lib/api-client';
import { parseCatalogQuery, toURLSearchParams } from '@/lib/catalog-url';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * `/category/[slug]` — a mesma biblioteca pública da home (seção 5.1/7 do
 * MVP2), filtrada por categoria. Reaproveita `CatalogGrid`/`CategoryNav`/
 * `SearchBar`/`SortToggle` e `buildCatalogHref`/`parseCatalogQuery` — a
 * única diferença estrutural é que `category` vem do segmento de rota (não
 * de `?category=`) e que `pathname` é repassado a `CatalogGrid`/`SortToggle`
 * para que paginação/ordenação/"limpar filtros" apontem de volta para esta
 * rota, não para `/`.
 *
 * De propósito, esta pasta não tem `loading.tsx` (por isso a home ficou em
 * `app/(home)/` com o seu — um route group não muda a URL, só isola o
 * boundary): qualquer `<Suspense>`/`loading.tsx` acima do `notFound()`
 * abaixo faz o Next.js iniciar o streaming da resposta (200) antes do
 * componente assíncrono resolver, e o status HTTP fica congelado em 200
 * mesmo quando o conteúdo final é a página de não encontrado — confirmado
 * manualmente (`curl -I`) tanto com um `loading.tsx` próprio quanto com o
 * da home cascateando por herança de segmento.
 */

/** `serverApi.getCategories` com a tag `components` (seção 7): a lista de categorias depende do catálogo (contagem por categoria). Chamada em `generateMetadata` e na página são deduplicadas pelo cache de `fetch` do Next dentro de uma mesma request. */
async function fetchCategories(): Promise<CategoryDto[]> {
  const response = await serverApi.getCategories({ revalidate: 300, tags: ['components'] });
  return response.data;
}

/** Pré-renderiza os slugs conhecidos (seção 7: "poucas categorias, todas pré-renderizadas"). */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const categories = await fetchCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: Pick<CategoryPageProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const categories = await fetchCategories();
  const category = categories.find((item) => item.slug === slug);

  // Sem categoria: devolve metadata vazia — a página em si chama notFound()
  // e resolve o boundary 404 corretamente.
  if (!category) {
    return {};
  }

  return {
    title: `${category.name} — UI Library`,
    description:
      category.description?.trim() ||
      `Browse ${category.name} components: preview them live and copy the code or an AI prompt.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const [categories, resolvedSearchParams] = await Promise.all([fetchCategories(), searchParams]);
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const currentSearchParams = toURLSearchParams(resolvedSearchParams);
  const query = parseCatalogQuery(currentSearchParams);
  const pathname = `/category/${category.slug}`;

  let data: ComponentListItemDto[] | null = null;
  let meta: PaginationMeta | null = null;
  let hasError = false;

  try {
    const response = await serverApi.getComponents(
      { ...query, category: category.slug },
      query.q ? { revalidate: 0 } : { revalidate: 300, tags: ['components'] },
    );
    data = response.data;
    meta = response.meta;
  } catch (error) {
    // A categoria já foi confirmada acima — um 404 aqui só ocorre se ela
    // foi removida entre as duas chamadas; trata-se como não encontrada,
    // não como uma falha recuperável.
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    hasError = true;
    if (!(error instanceof ApiError)) {
      throw error;
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to library
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-900">{category.name}</h1>
        {category.description && <p className="text-sm text-neutral-500">{category.description}</p>}
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense fallback={<SearchBarSkeleton />}>
          <SearchBar />
        </Suspense>
        <SortToggle sort={query.sort} currentSearchParams={currentSearchParams} pathname={pathname} />
      </div>

      <CategoryNav
        categories={categories}
        currentSearchParams={currentSearchParams}
        activeCategory={category.slug}
      />

      <CatalogGrid
        data={data}
        meta={meta}
        error={hasError}
        currentSearchParams={currentSearchParams}
        hasActiveFilters={Boolean(query.q)}
        pathname={pathname}
      />
    </main>
  );
}
