'use client';

import { componentStatusSchema, type AdminComponentDto, type ComponentStatus } from '@uilib/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStateMessages';
import { DataTable, type DataTableColumn } from './DataTable';
import { useAdminComponents } from './use-admin-components';

type StatusFilter = 'ALL' | ComponentStatus;

const STATUS_BADGE_CLASSES: Record<ComponentStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function filterComponents(
  components: AdminComponentDto[],
  search: string,
  status: StatusFilter,
): AdminComponentDto[] {
  const normalizedSearch = search.trim().toLowerCase();

  return components.filter((component) => {
    const matchesStatus = status === 'ALL' || component.status === status;
    const matchesSearch =
      normalizedSearch.length === 0 || component.name.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });
}

/**
 * `/admin/components` (seção 5.4/7 do MVP2): busca (por nome) e filtro por
 * status são calculados no cliente sobre a mesma listagem completa de
 * `useAdminComponents` — `GET /api/admin/components` (seção 4) não aceita
 * `q`/`status` na query, então filtrar client-side é o comportamento
 * correto aqui, não um atalho.
 *
 * Os links de criar/editar apontam para `/admin/components/new` e
 * `/admin/components/[id]/edit` (seção 7), que ainda não existem — essa
 * tarefa constrói só a base da área admin e a listagem, o formulário fica
 * para a próxima etapa.
 */
export function ComponentsListView() {
  const { data, isPending, isError, refetch } = useAdminComponents();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const filtered = useMemo(() => filterComponents(data ?? [], search, status), [data, search, status]);

  const columns: DataTableColumn<AdminComponentDto>[] = [
    { header: 'Name', cell: (component) => <span className="font-medium text-neutral-900">{component.name}</span> },
    { header: 'Category', cell: (component) => component.category.name },
    { header: 'Status', cell: (component) => <StatusBadge status={component.status} /> },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (component) => (
        <Link href={`/admin/components/${component.id}/edit`} className="text-sm font-medium text-neutral-700 hover:underline">
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Components</h1>
        <Link href="/admin/components/new" className={buttonVariants({ size: 'sm' })}>
          New component
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name…"
          aria-label="Search components by name"
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="sm:w-48"
        >
          <option value="ALL">All statuses</option>
          {componentStatusSchema.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>

      {isPending && <AdminLoadingState label="Loading components…" />}

      {isError && <AdminErrorState message="Couldn't load components right now." onRetry={() => refetch()} />}

      {!isPending && !isError && filtered.length === 0 && (
        <AdminEmptyState
          message={
            (data?.length ?? 0) === 0
              ? 'No components yet — create the first one.'
              : 'No components match your search/filter.'
          }
        />
      )}

      {!isPending && !isError && filtered.length > 0 && (
        <DataTable columns={columns} rows={filtered} getRowKey={(component) => component.id} caption="Admin components" />
      )}
    </div>
  );
}
