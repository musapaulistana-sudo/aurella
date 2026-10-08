import { z } from 'zod'
import { cartSyncSchema } from '@/schemas/cart-schema'
import { createAddressSchema } from '@/schemas/address-schema'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Aceita máscara; remove DDI +351 ou +55 quando colado no campo. */
function normalizePhone(value: string): string {
  let digits = onlyDigits(value)
  if (digits.startsWith('351') && digits.length === 12) {
    digits = digits.slice(3)
  }
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }
  return digits
}

const nifSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 9, 'NIF deve ter 9 dígitos')

export const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo').max(120),
  email: z.string().trim().email('E-mail inválido').max(200),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => v.length === 9, 'Telemóvel deve ter 9 dígitos'),
})

export const checkoutShippingAddressSchema = createAddressSchema
  .omit({
    label: true,
    is_default: true,
  })
  .transform((address) => ({
    ...address,
    street: address.street.trim(),
    number: address.number.trim(),
    neighborhood: address.neighborhood.trim(),
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
    zip_code: onlyDigits(address.zip_code),
    complement:
      address.complement == null || String(address.complement).trim() === ''
        ? null
        : String(address.complement).trim(),
  }))
  .pipe(
    z.object({
      street: z.string().min(1).max(200),
      number: z.string().min(1).max(30),
      complement: z.string().max(100).nullable(),
      neighborhood: z.string().min(1).max(100),
      city: z.string().min(1).max(100),
      state: z.string().min(1).max(50, 'Distrito inválido'),
      zip_code: z.string().length(7, 'Código postal inválido'),
    })
  )

export const checkoutBaseSchema = z.object({
  shipping_method_id: z.string().uuid('Selecione uma forma de envio'),
  items: cartSyncSchema.shape.items.min(1, 'Carrinho vazio'),
  document: nifSchema,
  customer: checkoutCustomerSchema,
  shipping_address: checkoutShippingAddressSchema,
})

export const checkoutPixSchema = checkoutBaseSchema

/** Payout SDK tokens include device fingerprint and often exceed 4k chars. */
const CARD_HASH_MAX_LENGTH = 65_536

export const checkoutCardSchema = checkoutBaseSchema.extend({
  card_hash: z
    .string()
    .min(10, 'Cartão não tokenizado')
    .max(CARD_HASH_MAX_LENGTH, 'Não foi possível validar o cartão. Tente novamente.'),
  installments: z.number().int().min(1).max(24),
})

export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>
export type CheckoutShippingAddressInput = z.infer<typeof checkoutShippingAddressSchema>
export type CheckoutPixInput = z.infer<typeof checkoutPixSchema>
export type CheckoutCardInput = z.infer<typeof checkoutCardSchema>

export function formatCheckoutValidationError(
  issues: z.ZodIssue[]
): string {
  const first = issues[0]
  if (!first) return 'Dados inválidos — verifique NIF, e-mail e morada'

  const path = first.path.join('.')
  const fieldLabels: Record<string, string> = {
    document: 'NIF',
    'customer.name': 'nome',
    'customer.email': 'e-mail',
    'customer.phone': 'telemóvel',
    'shipping_address.street': 'morada',
    'shipping_address.number': 'número',
    'shipping_address.neighborhood': 'localidade',
    'shipping_address.city': 'cidade',
    'shipping_address.state': 'distrito',
    'shipping_address.zip_code': 'código postal',
    shipping_method_id: 'envio',
    items: 'carrinho',
    card_hash: 'cartão',
    installments: 'parcelas',
  }

  const label = fieldLabels[path] ?? (path || 'dados')
  return `Dados inválidos — ${label}: ${first.message}`
}
