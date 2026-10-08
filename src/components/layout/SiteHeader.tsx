'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  IconBag,
  IconChevronLeft,
  IconCustomer,
  IconHeart,
  IconMenu,
} from '@/components/icons/DotIcons'
import type {
  MenuCategory,
  StoreLogo,
} from '@/types/layout'
import { useCart } from '@/providers/CartProvider'
import { useFavorites } from '@/providers/FavoritesProvider'
import { HeaderAccountMenu } from './HeaderAccountMenu'
import { HeaderCepBar } from './HeaderCepBar'
import { MainNav } from './MainNav'
import { SearchBar } from './SearchBar'
import { StoreLogoMark } from './StoreLogo'

type SiteHeaderProps = {
  storeName: string
  logo: StoreLogo
  menuCategories: MenuCategory[]
  phone: { display: string; href: string; areaCode: string; number: string }
  helpLink: { label: string; href: string }
  shippingPromoText: string
}

export function SiteHeader({
  storeName,
  logo,
  menuCategories,
  helpLink,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { itemCount: cartItemCount, hydrated, openCartDrawer } = useCart()
  const { favoriteCount, hydrated: favoritesHydrated } = useFavorites()
  const atendimentoHref =
    helpLink.href.trim() || '/fale-conosco'

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  function openMenu() {
    setMobileMenuOpen(true)
  }

  return (
    <div className="sticky top-0 z-50 overflow-visible bg-surface">
      <div className="mx-auto max-w-[1320px] px-4 md:px-6">
        {/* Linha principal — borda inferior só no container */}
        <header className="border-b border-border">
          <div className="flex items-center gap-2 py-3 md:gap-4 md:py-4">
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center text-text-primary md:hidden"
              onClick={openMenu}
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              <IconMenu className="size-6" />
            </button>

            <div className="logo flex min-w-0 flex-1 justify-center md:mr-2 md:flex-none md:justify-start">
              <StoreLogoMark logo={logo} storeName={storeName} />
            </div>

            <div className="hidden min-w-0 flex-1 md:block md:px-2 lg:px-6">
              <SearchBar />
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2 md:gap-4 lg:gap-5">
              <HeaderAccountMenu helpHref={atendimentoHref} />

              <Link
                href="/conta"
                className="flex size-9 items-center justify-center text-text-primary transition-colors hover:text-brand lg:hidden"
                aria-label="Minha conta"
              >
                <IconCustomer className="size-6" />
              </Link>

              <div className="relative">
                <Link
                  href="/favoritos"
                  className="flex size-9 items-center justify-center text-brand transition-opacity hover:opacity-85"
                  aria-label={`Favoritos${favoriteCount > 0 ? `, ${favoriteCount} itens` : ''}`}
                >
                  <IconHeart className="size-6" />
                </Link>
                {favoritesHydrated && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {favoriteCount > 9 ? '9+' : favoriteCount}
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={openCartDrawer}
                  className="flex size-9 items-center justify-center text-text-primary transition-colors hover:text-brand"
                  title="Carrinho"
                  aria-label={`Carrinho${cartItemCount > 0 ? `, ${cartItemCount} artigos` : ''}`}
                >
                  <IconBag className="size-6" />
                </button>
                {hydrated && cartItemCount > 0 && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pb-3 md:hidden">
            <SearchBar id="search-mobile" variant="mobile" />
          </div>

          <div className="border-t border-border md:hidden">
            <HeaderCepBar variant="mobile" />
          </div>
        </header>

        {/* Menu — borda inferior só no container */}
        <MainNav
          categories={menuCategories}
          className="hidden border-b border-border md:block"
          onOpenMenu={openMenu}
        />
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <aside
            className="fixed inset-y-0 left-0 z-[70] flex w-[min(100%,380px)] flex-col bg-surface shadow-2xl"
            aria-label="Menu principal"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <button
                type="button"
                className="flex size-10 items-center justify-center text-text-primary"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Voltar"
              >
                <IconChevronLeft className="size-7" />
              </button>
              <Link
                href="/conta/login"
                className="flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconCustomer className="size-5" />
                Entrar
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto">
              <ul>
                {menuCategories.map((category) => (
                  <li key={category.id} className="border-b border-border/80">
                    <Link
                      href={category.href}
                      className="flex items-center justify-between px-4 py-4 text-[15px] text-text-primary hover:bg-surface-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{category.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </>
      )}
    </div>
  )
}
