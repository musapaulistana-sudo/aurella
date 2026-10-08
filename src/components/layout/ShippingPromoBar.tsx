type ShippingPromoBarProps = {
  text: string
  className?: string
}

export function ShippingPromoBar({ text, className = '' }: ShippingPromoBarProps) {
  const label = text.trim()
  if (!label) return null

  return (
    <div
      className={`flex items-center justify-center bg-brand px-4 py-2 text-white ${className}`}
    >
      <p className="text-center text-sm font-medium">{label}</p>
    </div>
  )
}
