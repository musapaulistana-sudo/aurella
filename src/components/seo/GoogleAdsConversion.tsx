'use client'

import { useEffect } from 'react'
import { normalizeGoogleAdsConversion } from '@/lib/analytics/normalize'

const firedMemory = new Set<string>()
const STORAGE_PREFIX = 'ads_conversion:'

type GoogleAdsConversionProps = {
  orderId: string
  value: number
  currency?: string
  /** send_to configurado no admin (AW-…/label) */
  sendTo: string | null | undefined
  /** Só dispara quando true (pedido pago/confirmado) */
  enabled: boolean
}

function alreadyFired(orderId: string): boolean {
  if (firedMemory.has(orderId)) return true
  try {
    if (sessionStorage.getItem(`${STORAGE_PREFIX}${orderId}`)) return true
  } catch {
    /* private mode */
  }
  return false
}

function markFired(orderId: string) {
  firedMemory.add(orderId)
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${orderId}`, '1')
  } catch {
    /* private mode */
  }
}

function fireConversion(params: {
  orderId: string
  sendTo: string
  value: number
  currency: string
}): boolean {
  if (typeof window.gtag !== 'function') return false
  if (alreadyFired(params.orderId)) return true

  window.gtag('event', 'conversion', {
    send_to: params.sendTo,
    value: params.value,
    currency: params.currency,
    transaction_id: params.orderId,
  })
  markFired(params.orderId)
  return true
}

/**
 * Dispara conversão Google Ads uma única vez por pedido, com retry se gtag ainda não carregou.
 * Dedup via sessionStorage + memória (transaction_id no Ads evita duplicar no Google).
 */
export function GoogleAdsConversion({
  orderId,
  value,
  currency = 'EUR',
  sendTo,
  enabled,
}: GoogleAdsConversionProps) {
  useEffect(() => {
    if (!enabled || !orderId) return

    const normalized = normalizeGoogleAdsConversion(sendTo)
    if (!normalized) return
    if (alreadyFired(orderId)) return

    const amount = Number(value)
    if (!Number.isFinite(amount) || amount < 0) return

    const payload = {
      orderId,
      sendTo: normalized,
      value: amount,
      currency,
    }

    if (fireConversion(payload)) return

    const startedAt = Date.now()
    const maxWaitMs = 12000
    const intervalMs = 250
    let cancelled = false

    const timer = window.setInterval(() => {
      if (cancelled) return
      if (fireConversion(payload) || Date.now() - startedAt >= maxWaitMs) {
        window.clearInterval(timer)
      }
    }, intervalMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enabled, orderId, value, currency, sendTo])

  return null
}
