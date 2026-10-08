import Link from 'next/link'
import { Home } from 'lucide-react'

type ProductBreadcrumbProps = {
  categories: { name: string; slug: string }[]
  productName: string
}

export function ProductBreadcrumb({ categories, productName }: ProductBreadcrumbProps) {
  return (
    <nav className="mb-5 text-xs text-text-secondary md:mb-6 md:text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li className="flex items-center">
          <Link
            href="/"
            className="inline-flex size-5 items-center justify-center text-text-muted transition-colors hover:text-brand"
            aria-label="Início"
          >
            <Home className="size-3.5 shrink-0" aria-hidden />
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug} className="flex min-w-0 items-center gap-2">
            <span className="text-border" aria-hidden>
              |
            </span>
            <Link
              href={`/colecoes/${category.slug}`}
              className="truncate transition-colors hover:text-brand"
            >
              {category.name}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-2" aria-current="page">
          <span className="text-border" aria-hidden>
            |
          </span>
          <span className="truncate text-text-muted">{productName}</span>
        </li>
      </ol>
    </nav>
  )
}
