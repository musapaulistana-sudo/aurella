import { syncCartItems } from '@/lib/cart/sync-cart'
import {
  cancelCheckoutOrder,
  CheckoutError,
  createCheckoutOrder,
} from '@/lib/checkout/create-order'
import {
  getVorkpayClient,
  isPortugueseMobile,
  type VorkpayCustomer,
  type VorkpayItem,
  type VorkpayTrackingParameters,
} from '@/lib/vorkpay/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CheckoutCustomerInput,
  CheckoutShippingAddressInput,
} from '@/schemas/checkout-payment-schema'
import type { ValidatedCartLine } from '@/types/cart'

export type NsqpayMethod = 'mbway' | 'multibanco'

type CheckoutInput = {
  shippingMethodId: string
  items: Array<{ product_id: string; quantity: number }>
  document: string
  customer: CheckoutCustomerInput
  shippingAddress: CheckoutShippingAddressInput
  userId?: string | null
  addressId?: string | null
  method: NsqpayMethod
  mbwayPhone?: string
  originToken?: string | null
  trackingParameters?: VorkpayTrackingParameters | null
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function buildCustomer(
  customer: CheckoutCustomerInput,
  shippingAddress: CheckoutShippingAddressInput,
  mbwayPhone?: string
): VorkpayCustomer {
  const phone = mbwayPhone && isPortugueseMobile(mbwayPhone) ? mbwayPhone : customer.phone
  return {
    name: customer.name,
    email: customer.email,
    phone,
    address: [shippingAddress.street, shippingAddress.number, shippingAddress.complement]
      .filter(Boolean)
      .join(', '),
    city: shippingAddress.city,
    postalCode: `${shippingAddress.zip_code.slice(0, 4)}-${shippingAddress.zip_code.slice(4)}`,
    country: 'Portugal',
  }
}

function buildItems(lines: ValidatedCartLine[], shippingPrice: number, shippingName: string): VorkpayItem[] {
  const items: VorkpayItem[] = lines
    .filter((line) => line.available && line.quantity > 0)
    .map((line) => ({
      id: line.productId,
      name: line.name,
      quantity: line.quantity,
      priceInCents: toCents(line.price),
    }))

  if (shippingPrice > 0) {
    items.push({
      id: 'shipping',
      name: `Portes — ${shippingName}`,
      quantity: 1,
      priceInCents: toCents(shippingPrice),
    })
  }

  return items
}

async function prepareCheckoutLines(items: Array<{ product_id: string; quantity: number }>) {
  const cart = await syncCartItems({ items })
  const availableLines = cart.lines.filter((line) => line.available && line.quantity > 0)
  if (availableLines.length === 0) {
    throw new CheckoutError('Carrinho vazio ou indisponível', 'EMPTY_CART')
  }
  return { cart, availableLines }
}

export async function processNsqpayCheckout(input: CheckoutInput) {
  const { availableLines } = await prepareCheckoutLines(input.items)

  if (input.method === 'mbway') {
    const phone = (input.mbwayPhone ?? input.customer.phone).replace(/\D/g, '')
    if (!isPortugueseMobile(phone)) {
      throw new CheckoutError(
        'Telemóvel MB WAY inválido. Use o formato 9XXXXXXXX',
        'INVALID_MBWAY_PHONE'
      )
    }
    input.mbwayPhone = phone
  }

  const order = await createCheckoutOrder({
    shippingMethodId: input.shippingMethodId,
    items: availableLines.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
    })),
    userId: input.userId,
    addressId: input.addressId,
    customer: input.customer,
    shippingAddress: input.shippingAddress,
  })

  const customer = buildCustomer(input.customer, input.shippingAddress, input.mbwayPhone)
  const items = buildItems(availableLines, order.shipping_price, order.shipping_method_name ?? 'Envio')
  const vorkpay = getVorkpayClient()

  let payment
  try {
    payment = await vorkpay.createPayment(
      order.id,
      order.total,
      customer,
      items,
      input.trackingParameters ?? null,
      input.originToken ?? null
    )
  } catch (error) {
    await cancelCheckoutOrder(order.id)
    const message = error instanceof Error ? error.message : 'Falha ao iniciar pagamento'
    throw new CheckoutError(message, 'VORKPAY_INIT_FAILED')
  }

  const admin = createAdminClient()
  const { error: linkError } = await admin
    .from('orders')
    .update({
      vorkpay_transaction_id: payment.transactionId,
      payout_secure_id: payment.transactionId,
      payment_method: input.method,
      customer_document: input.document.replace(/\D/g, ''),
    })
    .eq('id', order.id)
    .eq('status', 'pending')

  if (linkError) {
    await cancelCheckoutOrder(order.id)
    throw new CheckoutError('Falha ao vincular pagamento à encomenda', 'VORKPAY_LINK_FAILED')
  }

  if (input.method === 'mbway') {
    try {
      await vorkpay.triggerMbway(payment.transactionId, input.mbwayPhone!)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao disparar MB WAY'
      throw new CheckoutError(message, 'VORKPAY_MBWAY_FAILED')
    }

    return {
      orderId: order.id,
      guestAccessToken: order.guest_access_token,
      total: order.total,
      transactionId: payment.transactionId,
      method: 'mbway' as const,
      message: 'Notificação MB WAY enviada. Confirme na app em até 4 minutos.',
    }
  }

  let mb
  try {
    mb = await vorkpay.generateMultibanco(payment.transactionId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar Multibanco'
    throw new CheckoutError(message, 'VORKPAY_MULTIBANCO_FAILED')
  }

  await admin
    .from('orders')
    .update({
      mb_entity: mb.entity,
      mb_reference: mb.reference,
      mb_expires_at: mb.expiresAt,
    })
    .eq('id', order.id)

  return {
    orderId: order.id,
    guestAccessToken: order.guest_access_token,
    total: order.total,
    transactionId: payment.transactionId,
    method: 'multibanco' as const,
    entity: mb.entity,
    reference: mb.reference,
    amount: mb.amount,
    expiresAt: mb.expiresAt,
  }
}

export async function findOrderByVorkpayTransactionId(transactionId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('id, status, payment_status, user_id, vorkpay_transaction_id, total')
    .eq('vorkpay_transaction_id', transactionId)
    .maybeSingle()
  return data
}
