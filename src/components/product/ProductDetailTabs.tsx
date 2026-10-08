type ProductDetailTabsProps = {
  description: string | null
}

export function ProductDetailTabs({ description }: ProductDetailTabsProps) {
  return (
    <section className="mt-8 md:mt-10">
      <div className="border-b border-border">
        <h2 className="inline-block border-b-2 border-brand pb-2 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Descrição
        </h2>
      </div>

      <div className="pt-6">
        {description ? (
          <div
            className="product-description max-w-none text-sm leading-relaxed text-text-secondary [&_a]:text-brand [&_h4]:mb-2 [&_h4]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <p className="text-sm text-text-muted">Descrição não disponível para este produto.</p>
        )}
      </div>
    </section>
  )
}
