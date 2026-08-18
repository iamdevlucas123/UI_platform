const PLACEHOLDER_COUNT = 8;

/** Skeleton de carregamento (seção 5.1 do MVP2) — usado em `app/loading.tsx`. */
export function GridSkeleton() {
  return (
    <ul aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <li
          key={index}
          className="h-56 animate-pulse rounded-lg border border-neutral-200 bg-neutral-100"
        />
      ))}
    </ul>
  );
}
