'use client';

import type { ComponentListItemDto, PaginationMeta } from '@uilib/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EmptyState } from './EmptyState';
import { Grid } from './Grid';
import { Pagination } from './Pagination';

export interface CatalogGridProps {
  data: ComponentListItemDto[] | null;
  meta: PaginationMeta | null;
  /** `true` quando a tentativa mais recente de buscar `data`/`meta` falhou. */
  error: boolean;
  currentSearchParams: URLSearchParams;
  hasActiveFilters: boolean;
  /** Rota-base repassada à paginação e ao "limpar filtros" (seção 7 do MVP2: reaproveitada por `/category/[slug]`). Default: home. */
  pathname?: string;
}

interface GoodResult {
  data: ComponentListItemDto[];
  meta: PaginationMeta;
}

/**
 * Orquestra os estados da seção 5.1 do MVP2 (vazio, erro recuperável,
 * banner discreto): `data`/`meta`/`error` chegam como props a cada
 * navegação (busca, ordenação, categoria, página) — como este componente
 * não é remontado entre navegações (fica no mesmo lugar da árvore), seu
 * `useState` sobrevive de uma requisição para a outra.
 *
 * Isso é o que permite distinguir "nunca carregou" (erro recuperável, com
 * retry) de "já tinha carregado e a atualização mais recente falhou"
 * (mantém `lastGood` na tela + banner discreto) — sem essa memória local,
 * uma falha transitória de refetch apagaria o conteúdo já em cache.
 */
export function CatalogGrid({
  data,
  meta,
  error,
  currentSearchParams,
  hasActiveFilters,
  pathname = '/',
}: CatalogGridProps) {
  const [lastGood, setLastGood] = useState<GoodResult | null>(data && meta ? { data, meta } : null);

  useEffect(() => {
    if (data && meta) {
      setLastGood({ data, meta });
    }
  }, [data, meta]);

  const display = data && meta ? { data, meta } : lastGood;

  if (!display) {
    return <ErrorState />;
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          Showing previously loaded results — couldn&apos;t refresh just now.
        </p>
      )}
      {display.data.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} clearHref={pathname} />
      ) : (
        <Grid items={display.data} />
      )}
      <Pagination meta={display.meta} currentSearchParams={currentSearchParams} pathname={pathname} />
    </div>
  );
}

/** Erro recuperável (seção 5.1 do MVP2): nunca houve dado para mostrar ainda. */
function ErrorState() {
  const router = useRouter();

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-200 p-10 text-center"
    >
      <p className="text-sm font-medium text-neutral-700">Couldn&apos;t load components right now.</p>
      <p className="text-sm text-neutral-500">Check your connection and try again.</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Try again
      </button>
    </div>
  );
}
