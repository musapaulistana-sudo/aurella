import { Suspense } from 'react'
import { TrackingPanel } from '@/components/tracking/TrackingPanel'

export default function AccountTrackingPage() {
  return (
    <Suspense fallback={<p className="text-text-secondary">A carregar…</p>}>
      <TrackingPanel
        basePath="/conta/rastreio"
        title="Rastrear encomenda"
        subtitle="Consulte o código de rastreio dos seus envios sem sair da loja."
      />
    </Suspense>
  )
}
