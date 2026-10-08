import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StoreLogoMark } from '@/components/layout/StoreLogo'
import type { StoreLogo } from '@/types/layout'

type CheckoutMinimalHeaderProps = {
  storeName: string
  logo: StoreLogo
}

export function CheckoutMinimalHeader({ storeName, logo }: CheckoutMinimalHeaderProps) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="relative mx-auto flex max-w-7xl items-center justify-center px-4 py-4 md:px-6">
        <Link
          href="/carrinho"
          className="absolute left-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand md:left-6"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Voltar ao carrinho</span>
          <span className="sm:hidden">Voltar</span>
        </Link>
        <StoreLogoMark logo={logo} storeName={storeName} />
      </div>
    </div>
  )
}
