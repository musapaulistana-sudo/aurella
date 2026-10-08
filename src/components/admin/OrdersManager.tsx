'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/fetch-api'
import { formatCurrency } from '@/lib/products/format'
import { orderStatusSchema, orderStatusUpdateSchema } from '@/schemas/order-schema'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; slug: string } | null
}

type OrderAddress = {
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
}

type Order = {
  id: string
  user_id: string | null
  status: string
  payment_status?: string | null
  payment_method?: string | null
  total: number
  subtotal?: number | null
  shipping_price?: number | null
  shipping_method_name?: string | null
  notes?: string | null
  created_at: string
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  payment_proof_path?: string | null
  payment_proof_filename?: string | null
  payment_proof_mime_type?: string | null
  payment_proof_uploaded_at?: string | null
  payment_proof_signed_url?: string | null
  confirmation_email_sent_at?: string | null
  tracking_code?: string | null
  track7_last_status?: string | null
  profiles?: { name?: string } | null
  addresses?: OrderAddress | null
  order_items?: OrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pagamento pendente',
  paid: 'Pago',
  refused: 'Recusado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

function formatAddress(address: OrderAddress): string {
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    address.neighborhood,
    `${address.city}/${address.state}`,
    address.zip_code,
  ]
    .filter(Boolean)
    .join(' — ')
}

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [proofOnly, setProofOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (proofOnly) params.set('proof', 'pending')
    const query = params.toString() ? `?${params.toString()}` : ''
    const { data, error: apiError } = await fetchApi<Order[]>(`/api/admin/orders${query}`)
    if (apiError) setError(apiError)
    else {
      setError(null)
      setOrders(data ?? [])
    }
  }, [statusFilter, proofOnly])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length
    const withProof = orders.filter(
      (o) => o.payment_proof_uploaded_at && o.status === 'pending'
    ).length
    const revenue = orders
      .filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0)
    return { pending, withProof, revenue, count: orders.length }
  }, [orders])

  async function updateStatus(
    id: string,
    status: string,
    options?: { confirmPayment?: boolean }
  ) {
    const parsed = orderStatusUpdateSchema.safeParse({
      id,
      status,
      confirmPayment: options?.confirmPayment,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Status inválido')
      return
    }

    setLoadingId(id)
    setInfo(null)
    const { error: apiError, message } = await fetchApi('/api/admin/orders', {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    })
    setLoadingId(null)

    if (apiError) {
      setError(apiError)
      return
    }

    setError(null)
    if (message) setInfo(message)
    load()
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error">{error}</Alert>}
      {info && <Alert type="success">{info}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Nesta lista">
          <p className="text-2xl font-bold text-[#000000]">{totals.count}</p>
        </Card>
        <Card title="Pendentes">
          <p className="text-2xl font-bold text-badge-discount">{totals.pending}</p>
        </Card>
        <Card title="Com comprovante">
          <p className="text-2xl font-bold text-brand">{totals.withProof}</p>
        </Card>
        <Card title="Total (lista)">
          <p className="text-2xl font-bold text-success">{formatCurrency(totals.revenue)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-text-secondary" htmlFor="order-status-filter">
          Filtrar status:
        </label>
        <select
          id="order-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          {orderStatusSchema.options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={proofOnly}
            onChange={(e) => setProofOnly(e.target.checked)}
          />
          Só com comprovante pendente
        </label>
        <Button type="button" variant="secondary" onClick={load}>
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        {orders.map((order) => {
          const expanded = expandedId === order.id
          const customerName =
            order.customer_name?.trim() || order.profiles?.name || 'Cliente'
          const hasProof = Boolean(order.payment_proof_uploaded_at)
          const isPending = order.status === 'pending'

          return (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                    {order.payment_status && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
                        {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
                      </span>
                    )}
                    {hasProof && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        Comprovante enviado
                      </span>
                    )}
                    {order.confirmation_email_sent_at && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                        E-mail enviado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {customerName}
                    {order.customer_email ? ` · ${order.customer_email}` : ''}
                    {' · '}
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-brand tabular-nums">
                    {formatCurrency(Number(order.total))}
                  </p>
                  {order.shipping_method_name && (
                    <p className="mt-1 text-xs text-text-muted">
                      Frete: {order.shipping_method_name}
                      {order.shipping_price != null &&
                        ` (${formatCurrency(Number(order.shipping_price))})`}
                    </p>
                  )}
                  {order.tracking_code && (
                    <p className="mt-1 text-xs text-text-muted">
                      Rastreio:{' '}
                      <span className="font-mono text-text-primary">{order.tracking_code}</span>
                      {order.track7_last_status ? ` · ${order.track7_last_status}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={order.status}
                    disabled={loadingId === order.id}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                    aria-label="Status do pedido"
                  >
                    {orderStatusSchema.options.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {isPending && (
                    <Button
                      type="button"
                      loading={loadingId === order.id}
                      onClick={() =>
                        updateStatus(order.id, 'confirmed', { confirmPayment: true })
                      }
                    >
                      Confirmar pagamento
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                  >
                    {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </Button>
                </div>
              </div>

              {expanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {order.customer_phone && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">Telefone</dt>
                        <dd>{order.customer_phone}</dd>
                      </div>
                    )}
                    {order.customer_email && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">E-mail</dt>
                        <dd>{order.customer_email}</dd>
                      </div>
                    )}
                    {order.payment_method && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">Pagamento</dt>
                        <dd>{order.payment_method}</dd>
                      </div>
                    )}
                    {order.subtotal != null && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text-muted">Subtotal</dt>
                        <dd className="tabular-nums">{formatCurrency(Number(order.subtotal))}</dd>
                      </div>
                    )}
                  </dl>

                  {order.addresses && (
                    <div>
                      <p className="font-semibold text-text-primary">Endereço de entrega</p>
                      <p className="mt-1 text-text-secondary">{formatAddress(order.addresses)}</p>
                    </div>
                  )}

                  {order.order_items && order.order_items.length > 0 && (
                    <div>
                      <p className="font-semibold text-text-primary">Itens</p>
                      <ul className="mt-2 space-y-1">
                        {order.order_items.map((item) => (
                          <li
                            key={item.id}
                            className="flex justify-between gap-4 text-text-secondary"
                          >
                            <span>
                              {item.products?.name ?? 'Produto'} × {item.quantity}
                            </span>
                            <span className="tabular-nums">
                              {formatCurrency(Number(item.subtotal))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasProof && (
                    <div>
                      <p className="font-semibold text-text-primary">Comprovante de pagamento</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Enviado em{' '}
                        {order.payment_proof_uploaded_at
                          ? new Date(order.payment_proof_uploaded_at).toLocaleString('pt-BR')
                          : '—'}
                        {order.payment_proof_filename
                          ? ` · ${order.payment_proof_filename}`
                          : ''}
                      </p>
                      {order.payment_proof_signed_url ? (
                        order.payment_proof_mime_type === 'application/pdf' ? (
                          <a
                            href={order.payment_proof_signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-sm text-brand hover:underline"
                          >
                            Abrir PDF do comprovante
                          </a>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={order.payment_proof_signed_url}
                            alt="Comprovante de pagamento"
                            className="mt-3 max-h-80 rounded-md border border-border object-contain"
                          />
                        )
                      ) : (
                        <p className="mt-2 text-text-secondary">
                          Comprovante registrado, mas a prévia não está disponível.
                        </p>
                      )}
                    </div>
                  )}

                  {order.notes && (
                    <div>
                      <p className="font-semibold text-text-primary">Observações</p>
                      <p className="mt-1 text-text-secondary">{order.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {orders.length === 0 && (
          <Card>
            <p className="text-text-secondary">Nenhum pedido encontrado.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
