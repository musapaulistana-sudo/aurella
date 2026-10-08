import { formatCurrency } from '@/lib/products/format'
import {
  DASHBOARD_TIMEZONE,
  addZonedDays,
  startOfZonedDay,
  zonedDayKey,
} from '@/lib/admin/dashboard-timezone'

export type DashboardPeriod = 'today' | 'yesterday' | '7' | '30' | '90' | 'all'

export type PaymentMethodKey = 'pix' | 'credit_card' | 'other'

export type MethodStats = {
  key: PaymentMethodKey
  label: string
  paidOrders: number
  paidRevenue: number
  attempts: number
  conversion: number
  totalVolume: number
  shareOfPaidOrders: number
  shareOfPaidRevenue: number
}

export type TopProductRow = {
  productId: string | null
  name: string
  imageUrl: string | null
  quantity: number
  orders: number
  revenue: number
}

export type DashboardMetrics = {
  period: DashboardPeriod
  periodLabel: string
  from: string | null
  to: string
  confirmedRevenue: number
  paidOrders: number
  ordersInPeriod: number
  pendingOrders: number
  averageTicket: number
  customers: number
  products: number
  methods: MethodStats[]
  revenueByDay: Array<{ date: string; label: string; revenue: number }>
  ordersByStatus: Array<{ status: string; label: string; count: number }>
  topProducts: TopProductRow[]
  soldProductsCount: number
}

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'all', label: 'Todo período' },
]

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const METHOD_LABEL: Record<PaymentMethodKey, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  other: 'Outros',
}

export function parseDashboardPeriod(raw: string | null | undefined): DashboardPeriod {
  if (
    raw === 'today' ||
    raw === 'yesterday' ||
    raw === '7' ||
    raw === '30' ||
    raw === '90' ||
    raw === 'all'
  ) {
    return raw
  }
  return '30'
}

export function periodStartIso(period: DashboardPeriod, now = new Date()): string | null {
  if (period === 'all') return null

  const todayKey = zonedDayKey(now, DASHBOARD_TIMEZONE)

  if (period === 'today') {
    return startOfZonedDay(todayKey, DASHBOARD_TIMEZONE).toISOString()
  }

  if (period === 'yesterday') {
    return startOfZonedDay(addZonedDays(todayKey, -1), DASHBOARD_TIMEZONE).toISOString()
  }

  const days = Number(period)
  return startOfZonedDay(addZonedDays(todayKey, -(days - 1)), DASHBOARD_TIMEZONE).toISOString()
}

/** Exclusive upper bound for the period, or null when open-ended (through now). */
export function periodEndIso(period: DashboardPeriod, now = new Date()): string | null {
  if (period === 'yesterday') {
    return startOfZonedDay(now, DASHBOARD_TIMEZONE).toISOString()
  }
  return null
}

export function periodDayCount(period: DashboardPeriod): number | null {
  if (period === 'all') return null
  if (period === 'today' || period === 'yesterday') return 1
  return Number(period)
}

export function periodLabel(period: DashboardPeriod): string {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? '30 dias'
}

export function normalizePaymentMethod(value: string | null | undefined): PaymentMethodKey {
  if (value === 'pix') return 'pix'
  if (value === 'credit_card' || value === 'card') return 'credit_card'
  return 'other'
}

export function isPaidOrder(order: {
  status?: string | null
  payment_status?: string | null
}): boolean {
  if (order.payment_status === 'paid') return true
  return ['confirmed', 'shipped', 'delivered'].includes(order.status ?? '')
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

export function formatDashboardCurrency(value: number): string {
  return formatCurrency(value)
}

export { STATUS_LABEL, METHOD_LABEL }
