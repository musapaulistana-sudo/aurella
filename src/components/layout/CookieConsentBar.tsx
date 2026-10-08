'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const COOKIE_CONSENT_KEY = 'loja-cookie-consent-v1'

export function CookieConsentBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-[90] bg-[#333333] text-white"
    >
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:px-6">
        <p className="text-sm leading-relaxed text-white/95">
          Utilizamos cookies para estatísticas de visitas e para melhorar a sua experiência de
          navegação. Ao continuar, concorda com a nossa{' '}
          <Link
            href="/paginas/politica-de-privacidade"
            className="font-medium text-brand underline underline-offset-2 hover:opacity-90"
          >
            política de privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded border border-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
        >
          Concordar e fechar
        </button>
      </div>
    </div>
  )
}
