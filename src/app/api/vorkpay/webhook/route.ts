import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import {
  cancelCheckoutOrder,
  confirmCheckoutPayment,
  findOrderById,
  recordWebhookEvent,
} from '@/lib/checkout/create-order'
import { findOrderByVorkpayTransactionId } from '@/lib/checkout/process-nsqpay'
import { getVorkpayClient } from '@/lib/vorkpay/client'

type VorkpayWebhookPayload = {
  event?: string
  data?: {
    transactionId?: string
    externalOrderId?: string
    status?: string
    amount?: number
    currency?: string
    paymentMethod?: string
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-vorkpay-signature')

  let valid = false
  try {
    valid = getVorkpayClient().verifyWebhook(rawBody, signature)
  } catch {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
  }

  let payload: VorkpayWebhookPayload
  try {
    payload = JSON.parse(rawBody) as VorkpayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const event = payload.event ?? ''
  const data = payload.data ?? {}
  const transactionId = data.transactionId ?? null
  const externalOrderId = data.externalOrderId ?? null
  const eventId = `${event}:${transactionId ?? externalOrderId ?? rawBody.slice(0, 64)}`

  let order =
    (transactionId ? await findOrderByVorkpayTransactionId(transactionId) : null) ??
    (externalOrderId ? await findOrderById(externalOrderId) : null)

  const firstSeen = await recordWebhookEvent({
    eventId,
    orderId: order?.id ?? null,
    payload,
  })

  if (!firstSeen) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  if (!order) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  if (event === 'payment.success' || data.status === 'paid') {
    if (order.payment_status !== 'paid' && order.status === 'pending') {
      const method =
        data.paymentMethod === 'MBWAY'
          ? 'mbway'
          : data.paymentMethod === 'REFERENCE'
            ? 'multibanco'
            : 'nsqpay'
      await confirmCheckoutPayment({
        orderId: order.id,
        paymentMethod: method,
        transactionId: null,
      })
      revalidatePath('/conta/pedidos')
      revalidatePath(`/pedido/${order.id}/obrigado`)
    }
  }

  if (event === 'payment.failed' || data.status === 'failed' || data.status === 'cancelled') {
    if (order.status === 'pending') {
      await cancelCheckoutOrder(order.id)
    }
  }

  return NextResponse.json({ ok: true })
}
