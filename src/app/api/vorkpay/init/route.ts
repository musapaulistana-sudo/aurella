import { jsonError, jsonSuccess } from '@/lib/api/response'
import { CheckoutError } from '@/lib/checkout/create-order'
import { getOptionalSessionUserId } from '@/lib/checkout/order-access'
import { processNsqpayCheckout } from '@/lib/checkout/process-nsqpay'
import { checkoutNsqpaySchema } from '@/schemas/nsqpay-checkout-schema'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Dados inválidos', 400)
  }

  const parsed = checkoutNsqpaySchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return jsonError(
      first
        ? `Dados inválidos — ${first.path.join('.') || 'campo'}: ${first.message}`
        : 'Dados inválidos',
      400
    )
  }

  if (parsed.data.method === 'mbway' && !parsed.data.mbway_phone) {
    return jsonError('Indique o telemóvel MB WAY (9XXXXXXXX)', 400)
  }

  const userId = await getOptionalSessionUserId()

  try {
    const result = await processNsqpayCheckout({
      shippingMethodId: parsed.data.shipping_method_id,
      items: parsed.data.items,
      document: parsed.data.document,
      customer: parsed.data.customer,
      shippingAddress: parsed.data.shipping_address,
      userId,
      method: parsed.data.method,
      mbwayPhone: parsed.data.mbway_phone,
      originToken: parsed.data.origin_token ?? null,
      trackingParameters: parsed.data.tracking_parameters ?? null,
    })

    return jsonSuccess(result, undefined, 201)
  } catch (e) {
    if (e instanceof CheckoutError) {
      const status =
        e.code === 'INVALID_MBWAY_PHONE' || e.code === 'EMPTY_CART' ? 400 : 502
      return jsonError(e.message, status, e.code)
    }
    return jsonError('Não foi possível iniciar o pagamento', 500)
  }
}
