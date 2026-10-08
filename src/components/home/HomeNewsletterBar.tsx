'use client'

import Link from 'next/link'
import { useState } from 'react'

type HomeNewsletterBarProps = {
  className?: string
}

export function HomeNewsletterBar({ className = '' }: HomeNewsletterBarProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <section className={`bg-surface ${className}`} aria-label="Newsletter">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 border-b border-border px-4 py-5 md:flex-row md:items-center md:justify-between md:gap-8 md:px-6 md:py-6">
        <p className="max-w-xl text-sm leading-snug text-text-primary md:text-[15px]">
          <span className="font-semibold text-brand">Subscreva</span> a newsletter e receba
          novidades e ofertas da Aurelle Cosmeticos.
        </p>

        <div className="w-full max-w-md">
          {submitted ? (
            <p className="text-sm font-medium text-success" role="status">
              Pronto! Em breve receberá novidades e ofertas.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="home-newsletter-email" className="sr-only">
                Indique o seu e-mail
              </label>
              <input
                id="home-newsletter-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Indique o seu e-mail"
                className="min-w-0 flex-1 rounded border border-border bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
              <button
                type="submit"
                className="shrink-0 rounded bg-text-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                Registar
              </button>
            </form>
          )}
          <Link
            href="/paginas/politica-de-privacidade"
            className="mt-2 inline-block text-xs text-text-secondary underline underline-offset-2 transition-colors hover:text-brand"
          >
            Consulte a política de privacidade
          </Link>
        </div>
      </div>
    </section>
  )
}
