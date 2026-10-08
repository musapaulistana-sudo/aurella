import { z } from 'zod'

const nifSchema = z
  .string()
  .max(11)
  .regex(/^(\d{9}|\d{3}\s?\d{3}\s?\d{3})$/, 'NIF inválido')

export const profileUpdateSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    cpf: nifSchema.optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Nenhum campo para atualizar',
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
