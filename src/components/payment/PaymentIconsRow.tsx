import Image from 'next/image'
import type { PaymentMethodIcon } from '@/types/payment'

type PaymentIconsRowProps = {
  icons: PaymentMethodIcon[]
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_STYLES = {
  sm: { height: 'h-8', maxWidth: 'max-w-[88px]', width: 96, heightPx: 32 },
  md: { height: 'h-10', maxWidth: 'max-w-[112px]', width: 120, heightPx: 40 },
  lg: { height: 'h-12', maxWidth: 'max-w-[140px]', width: 140, heightPx: 48 },
  // Faixa única no rodapé (Visa + Mastercard + MB Way + Multibanco)
  xl: { height: 'h-16 md:h-20', maxWidth: 'max-w-[360px] md:max-w-[440px]', width: 440, heightPx: 80 },
} as const

export function PaymentIconsRow({ icons, size = 'md', className = '' }: PaymentIconsRowProps) {
  if (icons.length === 0) return null

  const style = SIZE_STYLES[size]
  const isStrip = size === 'xl' || icons.length === 1

  return (
    <ul
      className={`flex flex-wrap items-center ${isStrip ? 'gap-0' : 'gap-3'} ${className}`}
      aria-label="Formas de pagamento"
    >
      {icons.map((icon) => (
        <li key={icon.id} className="inline-flex w-full max-w-full sm:w-auto">
          <Image
            src={icon.imageUrl}
            alt={icon.label}
            width={style.width}
            height={style.heightPx}
            className={`${style.height} w-auto ${style.maxWidth} object-contain object-left`}
          />
        </li>
      ))}
    </ul>
  )
}
