'use client';

import { computeDashboardStats } from './dashboard-stats';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from './AdminStateMessages';
import { useAdminComponents } from './use-admin-components';

const STATUS_LABELS = { DRAFT: 'Draft', PUBLISHED: 'Published' } as const;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

/**
 * Dashboard de `/admin` (seção 5.4 do MVP2): contagem de componentes por
 * status e por categoria, calculada em `computeDashboardStats` a partir da
 * mesma listagem administrativa completa usada em `/admin/components`
 * (`useAdminComponents`) — sem endpoint de agregado dedicado.
 */
export function AdminDashboard() {
  const { data, isPending, isError, refetch } = useAdminComponents();

  if (isPending) {
    return <AdminLoadingState label="Loading dashboard…" />;
  }

  if (isError) {
    return (
      <AdminErrorState message="Couldn't load the dashboard right now." onRetry={() => refetch()} />
    );
  }

  const stats = computeDashboardStats(data);

  if (stats.total === 0) {
    return <AdminEmptyState message="No components yet — create the first one to see stats here." />;
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="dashboard-status-heading">
        <h2 id="dashboard-status-heading" className="mb-3 text-sm font-semibold text-neutral-700">
          By status
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={stats.total} />
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <StatCard key={status} label={label} value={stats.byStatus[status as keyof typeof STATUS_LABELS]} />
          ))}
        </div>
      </section>

      <section aria-labelledby="dashboard-category-heading">
        <h2 id="dashboard-category-heading" className="mb-3 text-sm font-semibold text-neutral-700">
          By category
        </h2>
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {stats.byCategory.map((category) => (
            <li key={category.slug} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-neutral-700">{category.name}</span>
              <span className="font-medium text-neutral-900">{category.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
