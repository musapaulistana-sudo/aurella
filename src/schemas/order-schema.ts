import { z } from 'zod'

export const orderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
])

export const orderStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: orderStatusSchema,
  /** Quando true (ou status=confirmed), marca pagamento como pago e dispara e-mail. */
  confirmPayment: z.boolean().optional(),
})

export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>
