import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TrackingPanel } from '@/components/tracking/TrackingPanel'
import { buildPageMetadata } from '@/lib/seo/metadata'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: 'Rastrear encomenda',
    description: 'Acompanhe o estado e o histórico de entrega da sua encomenda.',
    path: '/rastreio',
  })
}

export default function TrackingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <Suspense fallback={<p className="text-text-secondary">A carregar…</p>}>
        <TrackingPanel basePath="/rastreio" />
      </Suspense>
    </div>
  )
}
