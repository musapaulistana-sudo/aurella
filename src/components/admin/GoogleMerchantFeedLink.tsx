'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function GoogleMerchantFeedLink() {
  const [copied, setCopied] = useState(false)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? ''
  const feedUrl = siteUrl ? `${siteUrl}/feed/google-merchant.xml` : '/feed/google-merchant.xml'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-text-primary">Feed do Google Merchant Center</p>
        <p className="mt-1 text-xs text-text-secondary">
          Cole esta URL em Merchant Center → Produtos → Feeds → Adicionar feed principal (busca
          programada, formato XML). Use exatamente o link com final <code>.xml</code>.
        </p>
        <a
          href={feedUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block break-all text-sm text-brand underline"
        >
          {feedUrl}
        </a>
      </div>
      <Button type="button" variant="secondary" onClick={handleCopy} className="shrink-0">
        {copied ? 'Link copiado!' : 'Copiar link'}
      </Button>
    </div>
  )
}
