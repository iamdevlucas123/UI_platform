import { AdminDashboard } from '@/components/admin/AdminDashboard';

/** Dashboard de `/admin` (seção 5.4 do MVP2): contagem de componentes por status e por categoria. */
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
      <AdminDashboard />
    </div>
  );
}
