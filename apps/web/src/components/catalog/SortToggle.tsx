import type { ComponentSort } from '@uilib/shared';
import Link from 'next/link';

import { buildCatalogHref } from '@/lib/catalog-url';

export interface SortToggleProps {
  sort: ComponentSort;
  currentSearchParams: URLSearchParams;
}

const OPTIONS: Array<{ value: ComponentSort; label: string }> = [
  { value: 'recent', label: 'Newest' },
  { value: 'name', label: 'A–Z' },
];

/** Ordenação (seção 5.1 do MVP2): mais recentes (padrão) e alfabética. */
export function SortToggle({ sort, currentSearchParams }: SortToggleProps) {
  return (
    <div
      role="group"
      aria-label="Sort components"
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 p-1 text-sm"
    >
      {OPTIONS.map((option) => {
        const isActive = sort === option.value;
        return (
          <Link
            key={option.value}
            href={buildCatalogHref('/', currentSearchParams, { sort: option.value })}
            aria-current={isActive ? 'true' : undefined}
            className={[
              'rounded-full px-3 py-1 transition-colors',
              isActive ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100',
            ].join(' ')}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
