import { z } from 'zod'

export const createAddressSchema = z.object({
  label: z.string().max(50).optional(),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(30),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50, 'Distrito inválido'),
  zip_code: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 7, 'Código postal inválido'),
  is_default: z.boolean().optional(),
})

export const updateAddressSchema = createAddressSchema.partial()

export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
