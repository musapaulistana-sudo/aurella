import { createAdminClient } from '@/lib/supabase/admin'
import { buildDashboardMetrics } from '@/lib/admin/build-dashboard-metrics'
import {
  parseDashboardPeriod,
  periodEndIso,
  periodStartIso,
  type DashboardMetrics,
  type DashboardPeriod,
} from '@/lib/admin/dashboard-types'

const ORDER_COLUMNS =
  'id, user_id, status, payment_status, payment_method, total, created_at'

const ORDER_ITEM_SELECT =
  'order_id, product_id, quantity, unit_price, subtotal, products(name, slug, product_images(sort_order, media:media_assets(public_url)))'

const ORDER_ITEM_SELECT_LEGACY =
  'order_id, product_id, quantity, unit_price, subtotal, products(name, slug)'

type LoadResult = {
  metrics: DashboardMetrics
  paymentColumnsAvailable: boolean
}

async function countTable(
  admin: ReturnType<typeof createAdminClient>,
  table: 'products' | 'profiles'
): Promise<number> {
  const { count } = await admin.from(table).select('id', { count: 'exact', head: true })
  return count ?? 0
}

export async function loadDashboardMetrics(
  periodInput?: string | null
): Promise<LoadResult> {
  const period: DashboardPeriod = parseDashboardPeriod(periodInput)
  const admin = createAdminClient()
  const from = periodStartIso(period)
  const toExclusive = periodEndIso(period)

  const [customers, products] = await Promise.all([
    countTable(admin, 'profiles'),
    countTable(admin, 'products'),
  ])

  let paymentColumnsAvailable = true

  let ordersQuery = admin
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: true })

  if (from) {
    ordersQuery = ordersQuery.gte('created_at', from)
  }
  if (toExclusive) {
    ordersQuery = ordersQuery.lt('created_at', toExclusive)
  }

  let { data: ordersData, error: ordersError } = await ordersQuery

  if (ordersError) {
    paymentColumnsAvailable = false
    let legacyQuery = admin
      .from('orders')
      .select('id, user_id, status, total, created_at')
      .order('created_at', { ascending: true })
    if (from) legacyQuery = legacyQuery.gte('created_at', from)
    if (toExclusive) legacyQuery = legacyQuery.lt('created_at', toExclusive)
    const legacy = await legacyQuery
    ordersData = (legacy.data ?? []).map((row) => ({
      ...row,
      payment_status: null,
      payment_method: null,
    }))
    ordersError = legacy.error
  }

  if (ordersError) {
    throw new Error('Não foi possível carregar os pedidos do dashboard')
  }

  const orders = ordersData ?? []
  const orderIds = orders.map((order) => order.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- nested supabase joins vary by schema
  let items: any[] = []

  if (orderIds.length > 0) {
    // Supabase `.in` has practical limits; chunk if needed
    const chunkSize = 200
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize)
      const withImages = await admin
        .from('order_items')
        .select(ORDER_ITEM_SELECT)
        .in('order_id', chunk)

      if (withImages.error) {
        const legacy = await admin
          .from('order_items')
          .select(ORDER_ITEM_SELECT_LEGACY)
          .in('order_id', chunk)
        if (legacy.error) {
          throw new Error('Não foi possível carregar os itens dos pedidos')
        }
        items = items.concat(legacy.data ?? [])
      } else {
        items = items.concat(withImages.data ?? [])
      }
    }
  }

  const metrics = buildDashboardMetrics({
    period,
    orders,
    items,
    customers,
    products,
  })

  return { metrics, paymentColumnsAvailable }
}
