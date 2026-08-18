import { GridSkeleton } from '@/components/catalog/GridSkeleton';

/**
 * Fallback de carregamento da home (seção 5.1 do MVP2). Só aparece em
 * navegações que o React não trata como transição (primeira visita, URL
 * colada/recarregada) — navegações disparadas pelos filtros do catálogo
 * usam `<Link>`/`startTransition`, que mantêm o conteúdo atual visível em
 * vez de cair neste fallback (ver `CatalogGrid`).
 */
export default function HomeLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 animate-pulse rounded bg-neutral-100" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-full bg-neutral-100 sm:max-w-xs" />
      <GridSkeleton />
    </main>
  );
}
