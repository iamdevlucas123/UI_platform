import type { PaginationMeta } from '@uilib/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { buildCatalogHref } from '@/lib/catalog-url';

export interface PaginationProps {
  meta: PaginationMeta;
  currentSearchParams: URLSearchParams;
}

/** Paginação (seção 5.1 do MVP2), estado refletido em `?page=`. */
export function Pagination({ meta, currentSearchParams }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const hasPrev = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-6 pt-2 text-sm">
      <PagerLink
        disabled={!hasPrev}
        href={buildCatalogHref('/', currentSearchParams, { page: meta.page - 1 })}
        label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </PagerLink>
      <span aria-live="polite" className="text-neutral-500">
        Page {meta.page} of {meta.totalPages}
      </span>
      <PagerLink
        disabled={!hasNext}
        href={buildCatalogHref('/', currentSearchParams, { page: meta.page + 1 })}
        label="Next page"
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </PagerLink>
    </nav>
  );
}

function PagerLink({
  disabled,
  href,
  label,
  children,
}: {
  disabled: boolean;
  href: string;
  label: string;
  children: ReactNode;
}) {
  // Um <a> "desabilitado" continua focável/ativável em vários leitores de
  // tela — um <span aria-disabled> comunica o estado sem esse problema.
  if (disabled) {
    return (
      <span aria-disabled="true" className="flex items-center gap-1 text-neutral-300">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className="flex items-center gap-1 text-neutral-700 hover:text-neutral-950">
      {children}
    </Link>
  );
}
