import Link from 'next/link';

export interface EmptyStateProps {
  hasActiveFilters: boolean;
}

/** Estado de vazio explicativo (seção 5.1 do MVP2). */
export function EmptyState({ hasActiveFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 p-10 text-center">
      <p className="text-sm font-medium text-neutral-700">
        {hasActiveFilters
          ? 'No components match your search or filters.'
          : 'No components published yet.'}
      </p>
      {hasActiveFilters && (
        <Link
          href="/"
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
        >
          Clear search and filters
        </Link>
      )}
    </div>
  );
}
