'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/fetch-api'
import {
  PERIOD_OPTIONS,
  formatDashboardCurrency,
  formatPercent,
  type DashboardMetrics,
  type DashboardPeriod,
  type MethodStats,
} from '@/lib/admin/dashboard-types'

type DashboardPayload = {
  metrics: DashboardMetrics
  paymentColumnsAvailable: boolean
}

type AdminDashboardProps = {
  initial: DashboardPayload
}

const METHOD_COLOR: Record<string, string> = {
  pix: '#2e7d32',
  credit_card: '#000000',
  other: '#9e9e9e',
}

function PeriodToggle({
  value,
  onChange,
  disabled,
}: {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-border bg-surface p-1">
      {PERIOD_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              active
                ? 'bg-[#000000] text-white'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value: string
  hint?: string
  href?: string
}) {
  const content = (
    <Card className="h-full !p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#000000]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </Card>
  )
  if (!href) return content
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {content}
    </Link>
  )
}

function MethodCard({ method }: { method: MethodStats }) {
  const accent = METHOD_COLOR[method.key] ?? METHOD_COLOR.other
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{method.label}</p>
          <p className="mt-1 text-xs text-text-secondary">
            Participação nos pedidos pagos
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-sm font-bold tabular-nums text-white"
          style={{ backgroundColor: accent }}
        >
          {formatPercent(method.shareOfPaidOrders)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-text-muted">Pedidos pagos</dt>
          <dd className="font-semibold tabular-nums">{method.paidOrders}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Receita paga</dt>
          <dd className="font-semibold tabular-nums">
            {formatDashboardCurrency(method.paidRevenue)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Tentativas</dt>
          <dd className="font-semibold tabular-nums">{method.attempts}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Conversão</dt>
          <dd className="font-semibold tabular-nums">{formatPercent(method.conversion)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-text-muted">Volume total (inclui pendentes)</dt>
          <dd className="font-semibold tabular-nums">
            {formatDashboardCurrency(method.totalVolume)}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-text-muted">% da receita confirmada</dt>
          <dd className="font-semibold tabular-nums">
            {formatPercent(method.shareOfPaidRevenue)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

function DonutChart({ methods }: { methods: MethodStats[] }) {
  const paidMethods = methods.filter((m) => m.paidOrders > 0)
  const total = paidMethods.reduce((sum, m) => sum + m.paidOrders, 0)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (total === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-text-secondary">
        Nenhum pedido pago no período.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-hidden>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#eee" strokeWidth="22" />
        {paidMethods.map((method) => {
          const fraction = method.paidOrders / total
          const length = fraction * circumference
          const dashOffset = -offset
          offset += length
          return (
            <circle
              key={method.key}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={METHOD_COLOR[method.key] ?? METHOD_COLOR.other}
              strokeWidth="22"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
            />
          )
        })}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-[#000000]"
          style={{ fontSize: 22, fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x="80"
          y="96"
          textAnchor="middle"
          className="fill-[#6b6b6b]"
          style={{ fontSize: 11 }}
        >
          pagos
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {paidMethods.map((method) => (
          <li key={method.key} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: METHOD_COLOR[method.key] ?? METHOD_COLOR.other }}
            />
            <span className="text-text-secondary">{method.label}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {formatPercent(method.shareOfPaidOrders)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RevenueLineChart({
  points,
}: {
  points: DashboardMetrics['revenueByDay']
}) {
  const max = Math.max(...points.map((p) => p.revenue), 1)
  const width = 640
  const height = 220
  const padX = 12
  const padY = 16
  const chartW = width - padX * 2
  const chartH = height - padY * 2

  if (points.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">Sem dados no período.</p>
    )
  }

  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? padX + chartW / 2
        : padX + (index / (points.length - 1)) * chartW
    const y = padY + chartH - (point.revenue / max) * chartH
    return { x, y, ...point }
  })

  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')

  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[220px] w-full min-w-[320px]"
        role="img"
        aria-label="Receita confirmada por dia"
      >
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padY + chartH - ratio * chartH
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="#eee"
              strokeWidth="1"
            />
          )
        })}
        <path d={path} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
        {coords.map((c) =>
          c.revenue > 0 ? (
            <circle key={c.date} cx={c.x} cy={c.y} r="3" fill="#000000" />
          ) : null
        )}
        {coords.map((c, index) =>
          index % labelStep === 0 || index === coords.length - 1 ? (
            <text
              key={`label-${c.date}`}
              x={c.x}
              y={height - 2}
              textAnchor="middle"
              className="fill-[#8a8a8a]"
              style={{ fontSize: 10 }}
            >
              {c.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  )
}

function StatusBars({
  rows,
}: {
  rows: DashboardMetrics['ordersByStatus']
}) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  if (rows.length === 0) {
    return <p className="py-8 text-sm text-text-secondary">Nenhum pedido no período.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.status}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="text-text-secondary">{row.label}</span>
            <span className="font-semibold tabular-nums">{row.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-[#000000]"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function TopProductsTable({
  products,
  soldProductsCount,
}: {
  products: DashboardMetrics['topProducts']
  soldProductsCount: number
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalized) return products.slice(0, 10)
    return products
      .filter((product) => product.name.toLowerCase().includes(normalized))
      .slice(0, 25)
  }, [products, normalized])

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Produtos mais comprados</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Com base em pedidos confirmados / pagos no período
          </p>
        </div>
        <label className="block w-full sm:max-w-xs">
          <span className="mb-1 block text-xs font-medium text-text-muted">Buscar produto</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do produto..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-[#000000]"
          />
        </label>
      </div>

      {!filtered.length ? (
        <p className="px-5 py-10 text-sm text-text-secondary">
          Nenhum produto vendido neste período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Qtd.</th>
                <th className="px-5 py-3 font-medium">Pedidos</th>
                <th className="px-5 py-3 font-medium">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product, index) => {
                const rank = normalized
                  ? products.findIndex((p) => p.productId === product.productId && p.name === product.name) +
                    1
                  : index + 1
                return (
                  <tr key={`${product.productId ?? product.name}-${index}`}>
                    <td className="px-5 py-3 tabular-nums text-text-muted">{rank}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : null}
                        </div>
                        <span className="font-medium text-text-primary">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{product.quantity}</td>
                    <td className="px-5 py-3 tabular-nums">{product.orders}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums">
                      {formatDashboardCurrency(product.revenue)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-border px-5 py-3 text-xs text-text-muted">
        {normalized
          ? `Resultados da busca (até 25). ${soldProductsCount} produtos vendidos no período.`
          : `Mostrando o top 10. Use a busca para encontrar qualquer produto vendido no período (${soldProductsCount} no total).`}
      </p>
    </Card>
  )
}

export function AdminDashboard({ initial }: AdminDashboardProps) {
  const [period, setPeriod] = useState<DashboardPeriod>(initial.metrics.period)
  const [payload, setPayload] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const skipFetch = useRef(true)

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false
      return
    }

    let cancelled = false
    startTransition(async () => {
      const { data, error: fetchError } = await fetchApi<DashboardPayload>(
        `/api/admin/dashboard?period=${period}`
      )
      if (cancelled) return
      if (fetchError || !data) {
        setError(fetchError ?? 'Não foi possível atualizar o dashboard')
        return
      }
      setError(null)
      setPayload(data)
    })

    return () => {
      cancelled = true
    }
  }, [period])

  const { metrics, paymentColumnsAvailable } = payload
  const pix = metrics.methods.find((m) => m.key === 'pix')
  const card = metrics.methods.find((m) => m.key === 'credit_card')

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Visão geral de pedidos, pagamentos e produtos mais vendidos
          </p>
          {!paymentColumnsAvailable && (
            <p className="mt-2 text-xs text-badge-discount">
              Aplique a migration de checkout para ver método de pagamento e status com precisão.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-badge-discount">{error}</p>}
        </div>
        <PeriodToggle value={period} onChange={setPeriod} disabled={isPending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Receita confirmada"
          value={formatDashboardCurrency(metrics.confirmedRevenue)}
          hint={`${metrics.paidOrders} pedidos pagos`}
          href="/admin/pedidos"
        />
        <KpiCard
          label="Pedidos no período"
          value={String(metrics.ordersInPeriod)}
          hint={`${metrics.pendingOrders} pendentes`}
          href="/admin/pedidos"
        />
        <KpiCard
          label="Ticket médio"
          value={formatDashboardCurrency(metrics.averageTicket)}
          hint="Com base em pedidos pagos"
        />
        <KpiCard
          label="Clientes"
          value={String(metrics.customers)}
          hint="Total de cadastros"
        />
        <KpiCard
          label="Produtos"
          value={String(metrics.products)}
          hint="Total no catálogo"
          href="/admin/produtos"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pix ? <MethodCard method={pix} /> : null}
        {card ? <MethodCard method={card} /> : null}
        <Card title="Pedidos pagos por método">
          <DonutChart methods={metrics.methods} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Receita confirmada por dia">
          <RevenueLineChart points={metrics.revenueByDay} />
        </Card>
        <Card title="Pedidos por status">
          <StatusBars rows={metrics.ordersByStatus} />
        </Card>
      </div>

      <TopProductsTable
        products={metrics.topProducts}
        soldProductsCount={metrics.soldProductsCount}
      />

      <Card title="Ações rápidas">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/admin/pedidos" className="text-brand hover:underline">
              Ver todos os pedidos
            </Link>
          </li>
          <li>
            <Link href="/admin/mensagens" className="text-brand hover:underline">
              Mensagens de contato
            </Link>
          </li>
          <li>
            <Link href="/admin/loja" className="text-brand hover:underline">
              Dados da loja
            </Link>
          </li>
          <li>
            <Link href="/admin/produtos" className="text-brand hover:underline">
              Gerenciar produtos
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  )
}
