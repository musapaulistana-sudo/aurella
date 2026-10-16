import { jsonSuccess } from '@/lib/api/response'
import { getCheckoutPaymentSettings } from '@/lib/payment/queries'
import { getVorkpayPublicKey } from '@/lib/vorkpay/client'
import { DEFAULT_CHECKOUT_PAYMENT_SETTINGS } from '@/types/payment'

export async function GET() {
  const checkout = await getCheckoutPaymentSettings().catch(() => DEFAULT_CHECKOUT_PAYMENT_SETTINGS)

  return jsonSuccess({
    checkout: {
      ...DEFAULT_CHECKOUT_PAYMENT_SETTINGS,
      ...checkout,
      pixEnabled: false,
      cardEnabled: false,
      mbwayEnabled: checkout.mbwayEnabled !== false,
      multibancoEnabled: checkout.multibancoEnabled !== false,
      vorkpayPublicKey: getVorkpayPublicKey(),
    },
  })
}
