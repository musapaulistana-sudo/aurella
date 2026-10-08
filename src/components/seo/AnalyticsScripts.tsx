'use client'

import { useEffect, useRef } from 'react'
import {
  escapeJsString,
  type ResolvedAnalyticsConfig,
} from '@/lib/analytics/normalize'

const GTAG_SCRIPT_ID = 'store-gtag-js'
const GTAG_INIT_ID = 'store-gtag-init'
const CLARITY_SCRIPT_ID = 'store-clarity'

type AnalyticsScriptsProps = {
  config: ResolvedAnalyticsConfig
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || []
  if (typeof window.gtag === 'function') return

  // Stub oficial do Google: dataLayer.push(arguments) — não push([...args]).
  window.gtag = function gtag(this: void) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments as unknown as never)
  }
}

export function AnalyticsScripts({ config }: AnalyticsScriptsProps) {
  const injectedKeyRef = useRef<string | null>(null)
  const primaryId = config.gtagPrimaryId
  const configIds = config.gtagConfigIds.join(',')
  const clarityId = config.clarityId
  const injectKey = `${primaryId ?? ''}|${configIds}|${clarityId ?? ''}`

  useEffect(() => {
    if (!config.hasAny) return

    // Evita reinjetar / destruir tags a cada Strict Mode remount ou re-render.
    if (injectedKeyRef.current === injectKey) return
    injectedKeyRef.current = injectKey

    if (config.hasGoogle && primaryId) {
      ensureGtagStub()

      if (!document.getElementById(GTAG_SCRIPT_ID)) {
        const external = document.createElement('script')
        external.id = GTAG_SCRIPT_ID
        external.async = true
        external.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`
        document.head.appendChild(external)
      }

      if (!document.getElementById(GTAG_INIT_ID)) {
        const configsJs = config.gtagConfigIds
          .map((id) => `gtag('config', '${escapeJsString(id)}');`)
          .join('\n')
        const init = document.createElement('script')
        init.id = GTAG_INIT_ID
        init.textContent = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
${configsJs}
`
        document.head.appendChild(init)
      }
    }

    if (clarityId && !document.getElementById(CLARITY_SCRIPT_ID)) {
      const clarity = document.createElement('script')
      clarity.id = CLARITY_SCRIPT_ID
      clarity.textContent = `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${escapeJsString(clarityId)}");
`
      document.head.appendChild(clarity)
    }

    // Não remove gtag/Clarity no unmount: tags globais devem viver a sessão toda.
    // Remover no cleanup do Strict Mode apagava gtag antes da conversão disparar.
  }, [config.hasAny, config.hasGoogle, primaryId, configIds, clarityId, injectKey, config.gtagConfigIds])

  return null
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
  }
}
