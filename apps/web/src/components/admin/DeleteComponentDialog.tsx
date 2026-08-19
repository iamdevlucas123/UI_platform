'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { isAuthError } from '@/app/admin/providers';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import type { ApiError } from '@/lib/api-client';

import { useDeleteComponent } from './use-component-mutations';

export interface DeleteComponentDialogProps {
  componentId: string;
  componentName: string;
}

/**
 * Exclusão de componente (seção 5.4 do MVP2): diálogo de confirmação → DELETE
 * → toast → volta para a listagem **só** depois da mutação confirmar
 * sucesso — nunca antes, nunca otimista.
 */
export function DeleteComponentDialog({ componentId, componentName }: DeleteComponentDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteMutation = useDeleteComponent();

  function handleConfirm(): void {
    deleteMutation.mutate(componentId, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: 'Component deleted', description: `"${componentName}" was removed.` });
        router.push('/admin/components');
      },
      onError: (error) => {
        // 401/403 já viram toast + redirect em `AdminProviders` (MutationCache
        // global) — mostrar de novo aqui duplicaria a mensagem.
        if (isAuthError(error)) {
          return;
        }
        toast({
          variant: 'destructive',
          title: "Couldn't delete component",
          description: (error as ApiError).message,
        });
      },
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Delete "${componentName}"?`}>
        <p className="text-sm text-neutral-600">
          This permanently removes the component. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}
          >
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
