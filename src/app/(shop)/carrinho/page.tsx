import type { Metadata } from 'next'
import { CartPageView } from '@/components/cart/CartPageView'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Carrinho',
  description: 'Revise os artigos do carrinho antes de finalizar a compra.',
  path: '/carrinho',
  noindex: true,
})

export default function CartPage() {
  return <CartPageView />
}
