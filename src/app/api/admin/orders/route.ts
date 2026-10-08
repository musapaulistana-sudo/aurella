import { createAdminClient } from '@/lib/supabase/admin'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { requireAdminUser } from '@/lib/auth/require-admin'
import { createPaymentProofSignedUrl } from '@/lib/checkout/payment-proof'
import { sendOrderConfirmationEmail } from '@/lib/email/send-order-confirmation'
import { syncOrderToTrack7 } from '@/lib/track7/sync-order'
import { orderStatusUpdateSchema } from '@/schemas/order-schema'

const ORDER_COLUMNS =
  'id, user_id, status, payment_status, payment_method, total, subtotal, shipping_price, shipping_method_name, address_id, notes, created_at, updated_at, customer_name, customer_email, customer_phone, payment_proof_path, payment_proof_filename, payment_proof_mime_type, payment_proof_uploaded_at, confirmation_email_sent_at, tracking_code, track7_last_status'

const ORDER_ITEM_COLUMNS =
  'id, product_id, quantity, unit_price, subtotal, products(name, slug)'

const ADDRESS_COLUMNS =
  'id, street, number, complement, neighborhood, city, state, zip_code'

const PROFILE_COLUMNS = 'id, name'

async function requireAdmin() {
  try {
    return await requireAdminUser()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') {
      return jsonError('Não autorizado', 401, 'UNAUTHORIZED')
    }
    if (e instanceof Error && e.message === 'FORBIDDEN') {
      return jsonError('Acesso negado', 403, 'FORBIDDEN')
    }
    return jsonError('Erro interno', 500)
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')
  const proofFilter = searchParams.get('proof')

  const admin = createAdminClient()

  let query = admin
    .from('orders')
    .select(
      `${ORDER_COLUMNS}, profiles(${PROFILE_COLUMNS}), addresses(${ADDRESS_COLUMNS}), order_items(${ORDER_ITEM_COLUMNS})`
    )
    .order('created_at', { ascending: false })

  if (proofFilter === 'pending') {
    query = query
      .not('payment_proof_uploaded_at', 'is', null)
      .eq('status', 'pending')
  } else if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    const legacy = await admin
      .from('orders')
      .select(`${ORDER_COLUMNS}, order_items(${ORDER_ITEM_COLUMNS})`)
      .order('created_at', { ascending: false })

    if (legacy.error) {
      return jsonError('Não foi possível carregar os pedidos', 500)
    }

    const withUrls = await Promise.all(
      (legacy.data ?? []).map(async (order) => ({
        ...order,
        payment_proof_signed_url: await createPaymentProofSignedUrl(
          (order as { payment_proof_path?: string | null }).payment_proof_path
        ),
      }))
    )
    return jsonSuccess(withUrls)
  }

  const withUrls = await Promise.all(
    (data ?? []).map(async (order) => ({
      ...order,
      payment_proof_signed_url: await createPaymentProofSignedUrl(order.payment_proof_path),
    }))
  )

  return jsonSuccess(withUrls)
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Dados inválidos', 400)
  }

  const parsed = orderStatusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Dados inválidos', 400)
  }

  const admin = createAdminClient()
  const shouldConfirmPayment =
    parsed.data.confirmPayment === true || parsed.data.status === 'confirmed'

  const updatePayload: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  }

  if (shouldConfirmPayment && parsed.data.status !== 'cancelled') {
    updatePayload.payment_status = 'paid'
  }

  const { data, error } = await admin
    .from('orders')
    .update(updatePayload)
    .eq('id', parsed.data.id)
    .select(ORDER_COLUMNS)
    .single()

  if (error || !data) {
    return jsonError('Não foi possível atualizar o pedido', 400)
  }

  let emailResult: { sent: boolean; reason?: string; email?: string } | null = null
  if (shouldConfirmPayment && parsed.data.status !== 'cancelled') {
    const result = await sendOrderConfirmationEmail(parsed.data.id)
    emailResult = result.sent
      ? { sent: true, email: result.email }
      : { sent: false, reason: result.reason }
    void syncOrderToTrack7(parsed.data.id)
  }

  return jsonSuccess(
    { ...data, emailResult },
    shouldConfirmPayment
      ? emailResult?.sent
        ? 'Pedido confirmado e e-mail enviado'
        : 'Pedido confirmado'
      : 'Status do pedido atualizado'
  )
}
