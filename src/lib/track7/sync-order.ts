import { createAdminClient } from '@/lib/supabase/admin'
import {
  createTrack7Order,
  getTrackingByOrderId,
  isTrack7Configured,
  type Track7CreateOrderPayload,
} from '@/lib/track7/client'

type OrderRow = {
  id: string
  total: number | string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_document: string | null
  shipping_address: unknown
  user_id: string | null
  address_id: string | null
  tracking_code: string | null
  track7_synced_at: string | null
  order_items?: Array<{
    quantity: number
    unit_price: number | string
    subtotal?: number | string | null
    products?: { name?: string | null } | { name?: string | null }[] | null
  }>
  addresses?: {
    street?: string
    number?: string
    complement?: string | null
    neighborhood?: string
    city?: string
    state?: string
    zip_code?: string
  } | null
}

function productName(products: unknown): string {
  if (!products) return 'Produto'
  const row = Array.isArray(products) ? products[0] : products
  if (!row || typeof row !== 'object') return 'Produto'
  const name = (row as { name?: string | null }).name
  return name?.trim() || 'Produto'
}

function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

function readShippingAddress(order: OrderRow): Track7CreateOrderPayload['address'] | null {
  const fromJson =
    order.shipping_address && typeof order.shipping_address === 'object'
      ? (order.shipping_address as Record<string, unknown>)
      : null
  const fromJoin = order.addresses

  const street =
    (typeof fromJson?.street === 'string' ? fromJson.street : null) ??
    fromJoin?.street ??
    null
  const number =
    (typeof fromJson?.number === 'string' ? fromJson.number : null) ??
    fromJoin?.number ??
    null
  const neighborhood =
    (typeof fromJson?.neighborhood === 'string' ? fromJson.neighborhood : null) ??
    fromJoin?.neighborhood ??
    null
  const city =
    (typeof fromJson?.city === 'string' ? fromJson.city : null) ?? fromJoin?.city ?? null
  const state =
    (typeof fromJson?.state === 'string' ? fromJson.state : null) ?? fromJoin?.state ?? null
  const zip =
    (typeof fromJson?.zip_code === 'string' ? fromJson.zip_code : null) ??
    fromJoin?.zip_code ??
    null
  const complement =
    (typeof fromJson?.complement === 'string' ? fromJson.complement : null) ??
    fromJoin?.complement ??
    null

  if (!street || !number || !neighborhood || !city || !state || !zip) return null

  return {
    street,
    number,
    complement,
    neighborhood,
    city,
    state: state.toUpperCase(),
    zipcode: onlyDigits(zip),
  }
}

async function resolveCustomer(
  order: OrderRow
): Promise<{ name: string; email: string; phone: string; document: string } | null> {
  let name = order.customer_name?.trim() || ''
  let email = order.customer_email?.trim() || ''
  let phone = onlyDigits(order.customer_phone)
  const document = onlyDigits(order.customer_document)

  if ((!name || !email) && order.user_id) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('name')
      .eq('id', order.user_id)
      .maybeSingle()
    if (!name && profile?.name) name = profile.name.trim()

    const { data: authUser } = await admin.auth.admin.getUserById(order.user_id)
    if (!email && authUser.user?.email) email = authUser.user.email
    if (!phone && authUser.user?.phone) phone = onlyDigits(authUser.user.phone)
  }

  if (!name || !email || phone.length < 10 || document.length < 11) {
    return null
  }

  return { name, email, phone, document }
}

/**
 * Envia o pedido confirmado para a Track7 e persiste tracking_code quando disponível.
 * Não lança erro para o fluxo de pagamento — falhas são só logadas.
 */
export async function syncOrderToTrack7(orderId: string): Promise<void> {
  if (!isTrack7Configured()) return

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .select(
      `id, total, customer_name, customer_email, customer_phone, customer_document,
       shipping_address, user_id, address_id, tracking_code, track7_synced_at,
       addresses(street, number, complement, neighborhood, city, state, zip_code),
       order_items(quantity, unit_price, subtotal, products(name))`
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[track7/sync] order not found', orderId, error?.message)
    }
    return
  }

  const row = order as unknown as OrderRow

  if (row.track7_synced_at && row.tracking_code) {
    return
  }

  const customer = await resolveCustomer(row)
  const address = readShippingAddress(row)
  const products = (row.order_items ?? [])
    .map((item) => ({
      name: productName(item.products),
      quantity: Number(item.quantity ?? 0),
      price:
        item.subtotal != null
          ? Number(item.subtotal) / Math.max(Number(item.quantity ?? 1), 1)
          : Number(item.unit_price ?? 0),
    }))
    .filter((item) => item.quantity > 0 && item.name)

  if (!customer || !address || products.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[track7/sync] incomplete payload', {
        orderId,
        hasCustomer: Boolean(customer),
        hasAddress: Boolean(address),
        products: products.length,
      })
    }
    return
  }

  try {
    const created = await createTrack7Order({
      transaction_id: row.id,
      currency: 'EUR',
      customer,
      address,
      products,
      total: Number(row.total),
    })

    let trackingCode = created.trackingCode

    if (!trackingCode) {
      try {
        const tracking = await getTrackingByOrderId(row.id)
        trackingCode = tracking.tracking_code
        if (tracking.current_status) {
          await admin
            .from('orders')
            .update({
              track7_last_status: tracking.current_status,
              tracking_code: trackingCode ?? row.tracking_code,
              track7_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
          return
        }
      } catch {
        /* tracking ainda pode não existir */
      }
    }

    await admin
      .from('orders')
      .update({
        tracking_code: trackingCode ?? row.tracking_code,
        track7_synced_at: new Date().toISOString(),
        track7_last_status: trackingCode ? 'Encomenda enviada à transportadora' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[track7/sync]', e)
    }
  }
}

/** Atualiza tracking_code/status local a partir da Track7 (consulta). */
export async function refreshOrderTrackingFromTrack7(orderId: string): Promise<string | null> {
  if (!isTrack7Configured()) return null
  try {
    const tracking = await getTrackingByOrderId(orderId)
    if (!tracking.tracking_code && !tracking.current_status) return tracking.tracking_code

    const admin = createAdminClient()
    await admin
      .from('orders')
      .update({
        ...(tracking.tracking_code ? { tracking_code: tracking.tracking_code } : {}),
        ...(tracking.current_status ? { track7_last_status: tracking.current_status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return tracking.tracking_code
  } catch {
    return null
  }
}
