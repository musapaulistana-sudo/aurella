import Link from 'next/link'
import type { PolicyLink, SocialLink } from '@/types/layout'
import { IconWhatsapp } from '@/components/icons/DotIcons'
import { SocialIcon } from './SocialIcon'

type TopBarProps = {
  policyLinks: PolicyLink[]
  socialLinks: SocialLink[]
  shippingPromoText: string
}

export function TopBar({ policyLinks, socialLinks, shippingPromoText }: TopBarProps) {
  const whatsapp = socialLinks.find((s) => s.type === 'whatsapp')
  const socialOnly = socialLinks.filter((s) => s.type !== 'whatsapp')

  return (
    <div className="hidden bg-surface text-[11px] text-text-secondary md:block md:text-xs">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 overflow-hidden border-b border-border px-4 py-2 md:gap-5 md:px-6">
        <nav
          className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap"
          aria-label="Links institucionais"
        >
          {policyLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {shippingPromoText.trim() ? (
          <span className="justify-self-center whitespace-nowrap font-medium text-brand">
            {shippingPromoText}
          </span>
        ) : (
          <span />
        )}

        <div className="flex shrink-0 items-center justify-self-end gap-2.5 md:gap-3">
          {whatsapp && (
            <a
              href={whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 text-brand hover:opacity-90 transition-opacity sm:flex"
              aria-label={whatsapp.label}
            >
              <IconWhatsapp className="size-4 shrink-0" />
              <span className="whitespace-nowrap font-medium">
                {whatsapp.display ?? whatsapp.label}
              </span>
            </a>
          )}

          {socialOnly.map((social) => (
            <a
              key={social.type}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-7 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-brand hover:text-brand"
              aria-label={social.label}
            >
              <SocialIcon type={social.type} className="size-3.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
