import {
  METHOD_LABEL,
  STATUS_LABEL,
  isPaidOrder,
  normalizePaymentMethod,
  periodDayCount,
  periodEndIso,
  periodLabel,
  periodStartIso,
  type DashboardMetrics,
  type DashboardPeriod,
  type MethodStats,
  type PaymentMethodKey,
  type TopProductRow,
} from '@/lib/admin/dashboard-types'
import {
  DASHBOARD_TIMEZONE,
  addZonedDays,
  formatDayLabel,
  zonedDayKey,
} from '@/lib/admin/dashboard-timezone'

type OrderRow = {
  id: string
  status: string
  payment_status?: string | null
  payment_method?: string | null
  total: number | string
  created_at: string
  user_id?: string | null
}

type OrderItemRow = {
  order_id: string
  product_id: string | null
  quantity: number
  unit_price: number | string
  subtotal?: number | string | null
  products?:
    | {
        name?: string | null
        slug?: string | null
        product_images?: Array<{
          sort_order?: number
          media?: { public_url?: string | null } | null
        }> | null
      }
    | Array<{
        name?: string | null
        slug?: string | null
        product_images?: Array<{
          sort_order?: number
          media?: { public_url?: string | null } | null
        }> | null
      }>
    | null
}

function readProduct(item: OrderItemRow) {
  if (!item.products) return null
  return Array.isArray(item.products) ? item.products[0] ?? null : item.products
}

function readProductImage(item: OrderItemRow): string | null {
  const product = readProduct(item)
  const images = product?.product_images
  if (!Array.isArray(images) || images.length === 0) return null
  const sorted = [...images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
  return sorted[0]?.media?.public_url ?? null
}

function emptyMethod(key: PaymentMethodKey): MethodStats {
  return {
    key,
    label: METHOD_LABEL[key],
    paidOrders: 0,
    paidRevenue: 0,
    attempts: 0,
    conversion: 0,
    totalVolume: 0,
    shareOfPaidOrders: 0,
    shareOfPaidRevenue: 0,
  }
}

export function buildDashboardMetrics(input: {
  period: DashboardPeriod
  orders: OrderRow[]
  items: OrderItemRow[]
  customers: number
  products: number
  now?: Date
}): DashboardMetrics {
  const now = input.now ?? new Date()
  const from = periodStartIso(input.period, now)
  const endExclusive = periodEndIso(input.period, now)
  const to = endExclusive
    ? new Date(new Date(endExclusive).getTime() - 1).toISOString()
    : now.toISOString()

  const orders = input.orders
  const paidOrdersList = orders.filter(isPaidOrder)
  const pendingOrders = orders.filter((order) => order.status === 'pending').length

  const confirmedRevenue = paidOrdersList.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const paidOrders = paidOrdersList.length
  const averageTicket = paidOrders > 0 ? confirmedRevenue / paidOrders : 0

  const methodsMap: Record<PaymentMethodKey, MethodStats> = {
    pix: emptyMethod('pix'),
    credit_card: emptyMethod('credit_card'),
    other: emptyMethod('other'),
  }

  for (const order of orders) {
    const method = normalizePaymentMethod(order.payment_method)
    const stats = methodsMap[method]
    const total = Number(order.total ?? 0)
    stats.attempts += 1
    stats.totalVolume += total
    if (isPaidOrder(order)) {
      stats.paidOrders += 1
      stats.paidRevenue += total
    }
  }

  const methods = (Object.keys(methodsMap) as PaymentMethodKey[])
    .map((key) => {
      const stats = methodsMap[key]
      stats.conversion = stats.attempts > 0 ? (stats.paidOrders / stats.attempts) * 100 : 0
      stats.shareOfPaidOrders = paidOrders > 0 ? (stats.paidOrders / paidOrders) * 100 : 0
      stats.shareOfPaidRevenue =
        confirmedRevenue > 0 ? (stats.paidRevenue / confirmedRevenue) * 100 : 0
      return stats
    })
    .filter((stats) => stats.key !== 'other' || stats.attempts > 0)

  const revenueByDayMap = new Map<string, number>()
  for (const order of paidOrdersList) {
    const key = zonedDayKey(order.created_at, DASHBOARD_TIMEZONE)
    if (!key) continue
    revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + Number(order.total ?? 0))
  }

  const revenueByDay: DashboardMetrics['revenueByDay'] = []
  if (input.period === 'all') {
    const keys = [...revenueByDayMap.keys()].sort()
    for (const key of keys) {
      revenueByDay.push({
        date: key,
        label: formatDayLabel(key),
        revenue: revenueByDayMap.get(key) ?? 0,
      })
    }
  } else {
    const days = periodDayCount(input.period) ?? 1
    const startOffset = input.period === 'yesterday' ? 1 : days - 1
    const endOffset = input.period === 'yesterday' ? 1 : 0
    const todayKey = zonedDayKey(now, DASHBOARD_TIMEZONE)

    for (let i = startOffset; i >= endOffset; i--) {
      const key = addZonedDays(todayKey, -i)
      revenueByDay.push({
        date: key,
        label: formatDayLabel(key),
        revenue: revenueByDayMap.get(key) ?? 0,
      })
    }
  }

  const statusCount = new Map<string, number>()
  for (const order of orders) {
    statusCount.set(order.status, (statusCount.get(order.status) ?? 0) + 1)
  }
  const ordersByStatus = [...statusCount.entries()]
    .map(([status, count]) => ({
      status,
      label: STATUS_LABEL[status] ?? status,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const paidOrderIds = new Set(paidOrdersList.map((order) => order.id))
  const productMap = new Map<
    string,
    TopProductRow & { orderIds: Set<string> }
  >()

  for (const item of input.items) {
    if (!paidOrderIds.has(item.order_id)) continue
    const product = readProduct(item)
    const key = item.product_id ?? `name:${product?.name ?? 'Produto removido'}`
    const quantity = Number(item.quantity ?? 0)
    const lineRevenue =
      item.subtotal != null ? Number(item.subtotal) : quantity * Number(item.unit_price ?? 0)

    const existing = productMap.get(key)
    if (existing) {
      existing.quantity += quantity
      existing.revenue += lineRevenue
      existing.orderIds.add(item.order_id)
      if (!existing.imageUrl) existing.imageUrl = readProductImage(item)
    } else {
      productMap.set(key, {
        productId: item.product_id,
        name: product?.name?.trim() || 'Produto removido',
        imageUrl: readProductImage(item),
        quantity,
        orders: 0,
        revenue: lineRevenue,
        orderIds: new Set([item.order_id]),
      })
    }
  }

  const topProducts = [...productMap.values()]
    .map(({ orderIds, ...row }) => ({
      ...row,
      orders: orderIds.size,
    }))
    .sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity
      return b.revenue - a.revenue
    })

  return {
    period: input.period,
    periodLabel: periodLabel(input.period),
    from,
    to,
    confirmedRevenue,
    paidOrders,
    ordersInPeriod: orders.length,
    pendingOrders,
    averageTicket,
    customers: input.customers,
    products: input.products,
    methods,
    revenueByDay,
    ordersByStatus,
    topProducts,
    soldProductsCount: topProducts.length,
  }
}
