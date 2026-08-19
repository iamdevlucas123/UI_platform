import { Button } from '@/components/ui/button';

/** Estado de carregamento (seção 5.4 do MVP2), reaproveitado pelo dashboard e pela listagem de componentes. */
export function AdminLoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-neutral-500">
      {label}
    </p>
  );
}

/** Estado de erro recuperável (seção 5.4 do MVP2) — nunca expõe detalhes internos, só oferece tentar de novo. */
export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-200 p-10 text-center"
    >
      <p className="text-sm font-medium text-neutral-700">{message}</p>
      <Button variant="default" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/** Estado vazio (seção 5.4 do MVP2) — sem itens depois de aplicados os filtros ou porque não há nenhum componente cadastrado ainda. */
export function AdminEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
      {message}
    </p>
  );
}
