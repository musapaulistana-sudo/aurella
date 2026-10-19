import type { FooterData } from '@/lib/layout/get-footer-data'
import type { SiteLayoutData } from '@/types/layout'
import type { StoreProfile } from '@/lib/store-profile/queries'
import { toStoreMediaUrl } from '@/lib/media/store-media-url'
import { absoluteUrl } from '@/lib/seo/site-url'
import { organizationId } from '@/lib/seo/json-ld/merchant-schemas'

type StoreJsonLdInput = {
  layout: SiteLayoutData
  footer: FooterData
  profile: StoreProfile
}

/** Telefone E.164 para schema da loja PT — nunca +55. */
function formatTelephone(profile: StoreProfile): string | null {
  const raw =
    profile.phone_href?.trim() ||
    `${profile.phone_area_code ?? ''}${profile.phone_number ?? ''}`.trim()
  if (!raw) return null

  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // Remove indicativos errados (BR legado) e força Portugal
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('351')) {
    digits = digits.slice(3)
  }

  // Telemóvel PT: 9 dígitos a começar por 9
  if (/^9\d{8}$/.test(digits)) {
    return `+351${digits}`
  }

  // Fixo PT: 9 dígitos a começar por 2
  if (/^2\d{8}$/.test(digits)) {
    return `+351${digits}`
  }

  // Fallback: se sobraram dígitos úteis, prefixa +351
  if (digits.length >= 9) {
    return `+351${digits.slice(-9)}`
  }

  return null
}

function buildPostalAddress(profile: StoreProfile): Record<string, unknown> | null {
  const streetParts = [
    profile.store_street,
    profile.store_street_number,
    profile.store_complement,
  ].filter(Boolean)

  if (streetParts.length === 0 && !profile.store_city) {
    return null
  }

  return {
    '@type': 'PostalAddress',
    streetAddress: streetParts.join(', ') || undefined,
    addressLocality: profile.store_city ?? undefined,
    addressRegion: profile.store_state ?? undefined,
    postalCode: profile.store_postal_code ?? undefined,
    addressCountry: profile.store_country || 'PT',
  }
}

export function buildStoreJsonLd({
  layout,
  footer,
  profile,
}: StoreJsonLdInput): Record<string, unknown> | null {
  const siteUrl = absoluteUrl('/')
  const orgId = organizationId()
  if (!siteUrl || !orgId) return null

  const displayName = profile.store_name.trim() || layout.storeName || footer.legal.storeName
  const legalName =
    profile.company_legal_name?.trim() ||
    footer.legal.companyLegalName?.trim() ||
    displayName

  const store: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': orgId,
    name: displayName,
    legalName,
    url: siteUrl,
  }

  const rawLogo = profile.logo_image_url || layout.logo.imageUrl
  const logo = toStoreMediaUrl(rawLogo)
  if (logo) {
    store.logo = logo
  }

  const description = profile.store_description?.trim()
  if (description) store.description = description

  const email = profile.contact_email?.trim() || footer.contact.email?.trim()
  const phone = formatTelephone(profile)
  if (email) store.email = email
  if (phone) store.telephone = phone

  const taxId = profile.cnpj?.trim() || footer.legal.cnpj?.trim()
  if (taxId) store.taxID = taxId

  const address = buildPostalAddress(profile)
  if (address) store.address = address

  if (profile.store_opening_hours.length > 0) {
    store.openingHoursSpecification = profile.store_opening_hours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.dayOfWeek,
      opens: slot.opens,
      closes: slot.closes,
    }))
  }

  return store
}

/** @deprecated use buildStoreJsonLd */
export const buildOrganizationJsonLd = buildStoreJsonLd
