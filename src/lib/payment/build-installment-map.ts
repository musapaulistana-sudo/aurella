import { calcInstallmentDisplay } from '@/lib/payment/installments'
import type { InstallmentDisplay, PaymentSettings } from '@/types/payment'
import type { ProductCardData } from '@/types/product'

/** Objeto plano (serializável em RSC → Client Components). Evitar `Map`. */
export type InstallmentByProductId = Record<string, InstallmentDisplay | null>

export function buildInstallmentMap(
  products: ProductCardData[],
  settings: PaymentSettings
): InstallmentByProductId {
  const map: InstallmentByProductId = {}
  for (const product of products) {
    map[product.id] = calcInstallmentDisplay(product.price, settings)
  }
  return map
}

export function getInstallmentForProduct(
  installments: InstallmentByProductId | undefined,
  productId: string
): InstallmentDisplay | null {
  if (!installments) return null
  return installments[productId] ?? null
}
