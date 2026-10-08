export type PaymentMethod = {
  id: string
  label: string
  imageUrl: string | null
}

export type PaymentMethodIcon = {
  id: string
  label: string
  imageUrl: string
}

/** Sugestões rápidas ao adicionar formas de pagamento no admin */
export const PAYMENT_METHOD_SUGGESTIONS: { id: string; label: string }[] = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'mbway', label: 'MB Way' },
  { id: 'multibanco', label: 'Multibanco' },
  { id: 'amex', label: 'American Express' },
]

export type PaymentSettings = {
  maxInstallments: number
  interestFreeInstallments: number
  minInstallmentValue: number
  monthlyInterestRate: number
  installmentTextInterestFree: string
  installmentTextWithInterest: string
  paymentMethods: PaymentMethod[]
}

export type InstallmentDisplay = {
  count: number
  value: number
  total: number
  interestFree: boolean
  template: string
  label: string
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  maxInstallments: 12,
  interestFreeInstallments: 5,
  minInstallmentValue: 5,
  monthlyInterestRate: 0,
  installmentTextInterestFree: '{count}x de {value} sem juros',
  installmentTextWithInterest: '{count}x de {value} com juros',
  paymentMethods: [],
}

export type CheckoutPaymentSettings = {
  pixEnabled: boolean
  pixDiscount: number
  cardEnabled: boolean
}

export const DEFAULT_CHECKOUT_PAYMENT_SETTINGS: CheckoutPaymentSettings = {
  pixEnabled: false,
  pixDiscount: 0,
  cardEnabled: true,
}
