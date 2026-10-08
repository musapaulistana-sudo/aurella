'use client'

import Link from 'next/link'
import { IconChevronDown, IconMenu } from '@/components/icons/DotIcons'
import type { MenuCategory } from '@/types/layout'
import { HeaderCepBar } from './HeaderCepBar'

type MainNavProps = {
  categories: MenuCategory[]
  className?: string
  onOpenMenu?: () => void
}

export function MainNav({ categories, className = '', onOpenMenu }: MainNavProps) {
  const items = categories.map((category) => ({
    id: category.id,
    href: category.href,
    label: category.label,
    hasDropdown: Boolean(category.hasDropdown),
  }))

  return (
    <nav className={`bg-surface ${className}`} aria-label="Categorias principais">
      <div className="flex min-w-0 items-stretch">
        <HeaderCepBar
          variant="desktop"
          className="hidden border-r border-border md:flex"
        />

        <ul className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          <li className="flex shrink-0 items-stretch border-r border-border">
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:text-brand"
            >
              <IconMenu className="size-5 shrink-0" />
              <span>Ver tudo</span>
            </button>
          </li>
          {items.map((item) => (
            <li key={item.id} className="flex shrink-0 items-stretch">
              <Link
                href={item.href}
                className="flex items-center gap-1 whitespace-nowrap px-4 py-3 text-sm font-normal text-text-primary transition-colors hover:text-brand"
              >
                {item.label}
                {item.hasDropdown && <IconChevronDown className="size-3.5 text-text-muted" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
