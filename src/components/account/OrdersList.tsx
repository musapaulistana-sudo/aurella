'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/fetch-api'
import { formatCurrency } from '@/lib/products/format'

type OrderItem = {
  id: string
  product_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
  name: string
  slug: string | null
  image_url: string | null
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
  status: string
  payment_status?: string | null
  payment_method?: string | null
  total: number
  subtotal?: number | null
  shipping_price?: number | null
  discount_amount?: number | null
  shipping_method_name?: string | null
  tracking_code?: string | null
  track7_last_status?: string | null
  created_at: string
  address?: OrderAddress | null
  order_items: OrderItem[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando pagamento',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'MB Way / Multibanco',
  credit_card: 'Cartão de crédito',
  card: 'Cartão de crédito',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchApi<Order[]>('/api/account/orders').then(({ data, error: apiError }) => {
      setLoading(false)
      if (apiError) {
        setError(apiError)
        return
      }
      setOrders(data ?? [])
    })
  }, [])

  if (loading) {
    return <p className="text-text-secondary">A carregar encomendas…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">As minhas encomendas</h1>
        <Link href="/conta/rastreio" className="text-sm font-medium text-brand hover:underline">
          Rastrear encomenda
        </Link>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {orders.length === 0 ? (
        <Card>
          <p className="text-text-secondary">Ainda não fez nenhuma encomenda.</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const expanded = expandedId === order.id
            const trackingHref = order.tracking_code
              ? `/conta/rastreio?codigo=${encodeURIComponent(order.tracking_code)}`
              : `/conta/rastreio?pedido=${encodeURIComponent(order.id)}`

            return (
              <li key={order.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        Encomenda #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {formatDate(order.created_at)}
                      </p>
                      {order.track7_last_status && (
                        <p className="mt-1 text-xs text-text-muted">{order.track7_last_status}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                      <p className="mt-1 font-bold tabular-nums">
                        {formatCurrency(Number(order.total))}
                      </p>
                    </div>
                  </div>

                  {order.tracking_code && (
                    <p className="mt-3 text-sm">
                      Rastreio:{' '}
                      <Link
                        href={trackingHref}
                        className="font-mono font-medium text-brand hover:underline"
                      >
                        {order.tracking_code}
                      </Link>
                    </p>
                  )}

                  {order.order_items?.length > 0 && (
                    <ul className="mt-4 space-y-3 border-t border-border pt-4">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="flex gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-primary">
                              {item.slug ? (
                                <Link
                                  href={`/produto/${item.slug}`}
                                  className="hover:text-brand"
                                >
                                  {item.name}
                                </Link>
                              ) : (
                                item.name
                              )}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Qtd. {item.quantity} · {formatCurrency(Number(item.unit_price))}{' '}
                              un.
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatCurrency(Number(item.subtotal))}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-sm font-medium text-brand hover:underline"
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                    >
                      {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                    {(order.tracking_code ||
                      ['confirmed', 'shipped', 'delivered'].includes(order.status)) && (
                      <Link
                        href={trackingHref}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Acompanhar entrega
                      </Link>
                    )}
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {order.subtotal != null && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-text-muted">Subtotal</dt>
                            <dd className="tabular-nums">
                              {formatCurrency(Number(order.subtotal))}
                            </dd>
                          </div>
                        )}
                        {Number(order.discount_amount ?? 0) > 0 && (
                          <div className="flex justify-between gap-4 text-success">
                            <dt>Desconto</dt>
                            <dd className="tabular-nums">
                              − {formatCurrency(Number(order.discount_amount))}
                            </dd>
                          </div>
                        )}
                        {order.shipping_price != null && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-text-muted">
                              Portes
                              {order.shipping_method_name
                                ? ` (${order.shipping_method_name})`
                                : ''}
                            </dt>
                            <dd className="tabular-nums">
                              {formatCurrency(Number(order.shipping_price))}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 font-semibold">
                          <dt>Total</dt>
                          <dd className="tabular-nums">
                            {formatCurrency(Number(order.total))}
                          </dd>
                        </div>
                        {order.payment_method && (
                          <div className="flex justify-between gap-4">
                            <dt className="text-text-muted">Pagamento</dt>
                            <dd>
                              {PAYMENT_METHOD_LABELS[order.payment_method] ??
                                order.payment_method}
                            </dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-4">
                          <dt className="text-text-muted">Status</dt>
                          <dd>{STATUS_LABELS[order.status] ?? order.status}</dd>
                        </div>
                      </dl>

                      {order.address && (
                        <div>
                          <p className="font-semibold text-text-primary">Morada de entrega</p>
                          <p className="mt-1 text-text-secondary">
                            {formatAddress(order.address)}
                          </p>
                        </div>
                      )}

                      {order.tracking_code && (
                        <div>
                          <p className="font-semibold text-text-primary">Código de rastreio</p>
                          <Link
                            href={trackingHref}
                            className="mt-1 inline-block font-mono text-brand hover:underline"
                          >
                            {order.tracking_code}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
