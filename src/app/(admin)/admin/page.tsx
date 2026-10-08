import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { loadDashboardMetrics } from '@/lib/admin/load-dashboard-metrics'

export default async function AdminDashboardPage() {
  const initial = await loadDashboardMetrics('30')

  return <AdminDashboard initial={initial} />
}
