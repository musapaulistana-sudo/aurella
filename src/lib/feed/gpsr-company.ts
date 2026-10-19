import { getSiteSettings } from '@/lib/layout/queries'
import { createPublicClient } from '@/lib/supabase/public'

export type GpsrParty = {
  name: string
  address: string
  email: string
  phone: string
}

/**
 * Dados GPSR para o feed Merchant (Portugal).
 * A VOLUMEXATO - LDA é o operador económico estabelecido na UE
 * (manufacturer + eu_responsible_person).
 */
export async function getGpsrResponsibleParty(): Promise<GpsrParty> {
  const supabase = createPublicClient()
  const settings = await getSiteSettings(supabase).catch(() => null)

  const name =
    settings?.company_legal_name?.trim() ||
    settings?.store_name?.trim() ||
    'VOLUMEXATO - LDA'

  const address =
    settings?.contact_address?.trim() ||
    'Avenida Infante Dom Henrique 107, 2º Direito, Tercena, 2730-100 Barcarena, Portugal'

  const email = settings?.contact_email?.trim() || 'sac@aurellecosmeticos.pt'

  let phone = settings?.phone_href?.replace(/^tel:/i, '').trim() || ''
  if (!phone && settings?.phone_number) {
    const digits = settings.phone_number.replace(/\D/g, '')
    phone = digits.startsWith('351') ? `+${digits}` : `+351${digits}`
  }
  if (!phone) phone = '+351910369316'

  return {
    name,
    address: address.includes('Portugal') ? address : `${address}, Portugal`,
    email,
    phone,
  }
}
