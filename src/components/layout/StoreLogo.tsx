import Link from 'next/link'
import type { StoreLogo } from '@/types/layout'

type StoreLogoProps = {
  logo: StoreLogo
  storeName: string
  className?: string
}

export function StoreLogoMark({ logo, storeName, className }: StoreLogoProps) {
  if (logo.imageUrl) {
    return (
      <Link
        href="/"
        className={`inline-flex shrink-0 items-center ${className ?? ''}`}
        title={storeName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.imageUrl}
          alt={storeName}
          className="h-9 w-auto max-w-[160px] object-contain md:h-11"
        />
      </Link>
    )
  }

  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center text-xl font-bold tracking-tight text-logo md:text-2xl ${className ?? ''}`}
      title={storeName}
    >
      {storeName}
    </Link>
  )
}
