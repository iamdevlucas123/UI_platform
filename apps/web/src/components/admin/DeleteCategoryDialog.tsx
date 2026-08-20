'use client';

import { useState } from 'react';

import { isAuthError } from '@/app/admin/providers';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import type { ApiError } from '@/lib/api-client';

import { useDeleteCategory } from './use-category-mutations';

export interface DeleteCategoryDialogProps {
  categoryId: string;
  categoryName: string;
}

/**
 * Exclusão de categoria (seção 5.4 do MVP2): diálogo de confirmação →
 * DELETE → toast → fecha **só** depois da mutação confirmar sucesso.
 *
 * Em `409 CATEGORY_IN_USE` (categoria com componentes associados) a
 * categoria não é apagada — o diálogo **permanece aberto** e mostra a
 * mensagem exata devolvida pela API (`error.message`, ex.: "Category has
 * associated components") dentro do próprio diálogo, não só em um toast que
 * pode passar despercebido, para deixar claro que a exclusão foi bloqueada
 * e não concluída. Não há cascade nem exclusão forçada — o único caminho
 * para desbloquear é mover/apagar os componentes da categoria primeiro.
 */
export function DeleteCategoryDialog({ categoryId, categoryName }: DeleteCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteCategory();

  function handleOpen(): void {
    setBlockedMessage(null);
    setOpen(true);
  }

  function handleClose(): void {
    setBlockedMessage(null);
    setOpen(false);
  }

  function handleConfirm(): void {
    setBlockedMessage(null);
    deleteMutation.mutate(categoryId, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: 'Category deleted', description: `"${categoryName}" was removed.` });
      },
      onError: (error) => {
        // 401/403 já viram toast + redirect em `AdminProviders` (MutationCache
        // global) — mostrar de novo aqui duplicaria a mensagem.
        if (isAuthError(error)) {
          return;
        }
        setBlockedMessage((error as ApiError).message);
      },
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={handleOpen}>
        Delete
      </Button>
      <Dialog open={open} onClose={handleClose} title={`Delete "${categoryName}"?`}>
        <p className="text-sm text-neutral-600">
          This permanently removes the category. This action cannot be undone.
        </p>
        {blockedMessage && (
          <p role="alert" className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Couldn&apos;t delete this category: {blockedMessage}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
