import { z } from 'zod'
import { checkoutBaseSchema } from '@/schemas/checkout-payment-schema'

const trackingParametersSchema = z
  .record(z.string(), z.string())
  .optional()
  .nullable()

export const checkoutNsqpaySchema = checkoutBaseSchema.extend({
  method: z.enum(['mbway', 'multibanco']),
  mbway_phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .optional(),
  origin_token: z.string().max(4000).optional().nullable(),
  tracking_parameters: trackingParametersSchema,
})

export type CheckoutNsqpayInput = z.infer<typeof checkoutNsqpaySchema>
