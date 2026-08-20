'use client';

import type { CategoryDto, CreateCategoryInput } from '@uilib/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStateMessages';
import { CategoryForm } from './CategoryForm';
import { DataTable, type DataTableColumn } from './DataTable';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { useCategories } from './use-categories';

const EMPTY_DEFAULTS: CreateCategoryInput = { name: '', slug: '', description: '', position: 0 };

function toFormValues(category: CategoryDto): CreateCategoryInput {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    position: category.position,
  };
}

type DialogState = { mode: 'create' } | { mode: 'edit'; category: CategoryDto } | null;

/**
 * `/admin/categories` (seção 5.4/7 do MVP2). Ao contrário de componentes,
 * não há rotas dedicadas `/new`/`/[id]/edit` (seção 7: a estrutura só lista
 * `categories/page.tsx`) — criar/editar acontecem num `<Dialog>` sobre a
 * própria listagem, condizente com "não há workflow de aprovação, histórico
 * ou editor visual" (seção 5.4): a tela fica deliberadamente simples.
 *
 * `useCategories` (a mesma query pública reaproveitada pelo `<select>` de
 * `ComponentForm`) já basta como fonte de dados — não existe `GET
 * /api/admin/categories` dedicado.
 */
export function CategoriesListView() {
  const { data, isPending, isError, refetch } = useCategories();
  const [dialogState, setDialogState] = useState<DialogState>(null);

  const columns: DataTableColumn<CategoryDto>[] = [
    { header: 'Position', cell: (category) => category.position },
    { header: 'Name', cell: (category) => <span className="font-medium text-neutral-900">{category.name}</span> },
    { header: 'Slug', cell: (category) => <span className="text-neutral-500">{category.slug}</span> },
    { header: 'Components', cell: (category) => category.componentCount },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (category) => (
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setDialogState({ mode: 'edit', category })}>
            Edit
          </Button>
          <DeleteCategoryDialog categoryId={category.id} categoryName={category.name} />
        </div>
      ),
    },
  ];

  const dialogTitle = dialogState?.mode === 'edit' ? `Edit "${dialogState.category.name}"` : 'New category';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Categories</h1>
        <Button size="sm" onClick={() => setDialogState({ mode: 'create' })}>
          New category
        </Button>
      </div>

      {isPending && <AdminLoadingState label="Loading categories…" />}

      {isError && <AdminErrorState message="Couldn't load categories right now." onRetry={() => refetch()} />}

      {!isPending && !isError && (data?.length ?? 0) === 0 && (
        <AdminEmptyState message="No categories yet — create the first one." />
      )}

      {!isPending && !isError && (data?.length ?? 0) > 0 && (
        <DataTable columns={columns} rows={data ?? []} getRowKey={(category) => category.id} caption="Admin categories" />
      )}

      <Dialog open={dialogState !== null} onClose={() => setDialogState(null)} title={dialogTitle}>
        {dialogState && (
          <CategoryForm
            mode={dialogState.mode}
            categoryId={dialogState.mode === 'edit' ? dialogState.category.id : undefined}
            defaultValues={dialogState.mode === 'edit' ? toFormValues(dialogState.category) : EMPTY_DEFAULTS}
            onSuccess={() => setDialogState(null)}
            onCancel={() => setDialogState(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
