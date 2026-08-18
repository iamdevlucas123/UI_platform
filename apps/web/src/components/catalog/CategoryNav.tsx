import type { CategoryDto } from '@uilib/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { buildCatalogHref } from '@/lib/catalog-url';

export interface CategoryNavProps {
  categories: CategoryDto[];
  currentSearchParams: URLSearchParams;
  activeCategory?: string;
}

/**
 * Filtro por categoria (seção 5.1 do MVP2): cada categoria navega para sua
 * rota dedicada `/category/[slug]` (seção 7), não `/?category=`. `q`/`sort`
 * atuais são preservados na troca via `buildCatalogHref`; `category` some
 * das query params porque passa a viver no path.
 */
export function CategoryNav({ categories, currentSearchParams, activeCategory }: CategoryNavProps) {
  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <CategoryPill
        href={buildCatalogHref('/', currentSearchParams, { category: undefined })}
        isActive={!activeCategory}
      >
        All
      </CategoryPill>
      {categories.map((category) => (
        <CategoryPill
          key={category.id}
          href={buildCatalogHref(`/category/${category.slug}`, currentSearchParams, {
            category: undefined,
          })}
          isActive={activeCategory === category.slug}
        >
          {category.name}
          <span className="ml-1 text-neutral-400">{category.componentCount}</span>
        </CategoryPill>
      ))}
    </nav>
  );
}

function CategoryPill({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'true' : undefined}
      className={[
        'rounded-full border px-3 py-1 text-sm transition-colors',
        isActive
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}
