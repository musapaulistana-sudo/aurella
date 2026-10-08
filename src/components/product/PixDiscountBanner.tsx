type PixDiscountBannerProps = {
  discountPercent: number
}

function formatPercentLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

export function PixDiscountBanner({ discountPercent }: PixDiscountBannerProps) {
  if (discountPercent <= 0) return null

  const percentLabel = formatPercentLabel(discountPercent)

  return (
    <div className="flex items-center gap-3 rounded-md border border-[#b8d4f0] border-l-4 border-l-[#1e4f8c] bg-[#e8f3fc] px-3 py-2.5">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1e4f8c] text-sm font-bold leading-none text-white"
        aria-hidden
      >
        {percentLabel}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#1e4f8c]">MB Way / Multibanco</p>
        <p className="text-xs text-[#3d5a80] sm:text-sm">
          {percentLabel} de desconto com MB Way / Multibanco
        </p>
      </div>
    </div>
  )
}
