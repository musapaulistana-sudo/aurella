'use client'

import { Copy, Check, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { guestOrderHeaders, guestOrderQuery } from '@/lib/checkout/guest-access'
import { formatCurrency } from '@/lib/products/format'

type CheckoutPixPanelProps = {
  orderId?: string
  total: number
  discountAmount: number
  qrCode: string | null
  qrImage: string | null
  expiresAt: string | null
  polling: boolean
  initialProofUploadedAt?: string | null
  initialProofFilename?: string | null
  onRefresh?: () => void
}

type ProofState = {
  filename: string | null
  uploadedAt: string | null
  previewUrl: string | null
}

export function CheckoutPixPanel({
  orderId,
  total,
  discountAmount,
  qrCode,
  qrImage,
  expiresAt,
  polling,
  initialProofUploadedAt = null,
  initialProofFilename = null,
  onRefresh,
}: CheckoutPixPanelProps) {
  const [copied, setCopied] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [proof, setProof] = useState<ProofState>({
    filename: initialProofFilename,
    uploadedAt: initialProofUploadedAt,
    previewUrl: null,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (qrImage || !qrCode) {
      setGeneratedImage(null)
      return
    }

    let active = true
    import('qrcode').then((QRCode) =>
      QRCode.toDataURL(qrCode, { margin: 1, width: 256, errorCorrectionLevel: 'M' }).then(
        (url) => {
          if (active) setGeneratedImage(url)
        }
      )
    )

    return () => {
      active = false
    }
  }, [qrCode, qrImage])

  useEffect(() => {
    setProof((prev) => ({
      ...prev,
      filename: initialProofFilename,
      uploadedAt: initialProofUploadedAt,
    }))
  }, [initialProofFilename, initialProofUploadedAt])

  const displayImage = qrImage ?? generatedImage

  async function handleCopy() {
    if (!qrCode) return
    try {
      await navigator.clipboard.writeText(qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function handleProofUpload(file: File | null) {
    if (!orderId || !file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const body = new FormData()
      body.append('file', file)

      const res = await fetch(
        `/api/checkout/orders/${orderId}/payment-proof${guestOrderQuery(orderId)}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: guestOrderHeaders(orderId),
          body,
        }
      )
      const json = (await res.json()) as {
        error: boolean
        message?: string
        data?: {
          filename: string | null
          uploadedAt: string | null
          previewUrl: string | null
        }
      }

      if (!res.ok || json.error || !json.data) {
        setUploadError(json.message ?? 'Não foi possível enviar o comprovativo')
        return
      }

      setProof({
        filename: json.data.filename,
        uploadedAt: json.data.uploadedAt,
        previewUrl: json.data.previewUrl,
      })
      setUploadSuccess(
        json.message ?? 'Comprovativo enviado. A nossa equipa vai analisar o pagamento.'
      )
    } catch {
      setUploadError('Ocorreu um erro ao enviar o comprovativo')
    } finally {
      setUploading(false)
    }
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-PT', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null

  return (
    <div className="space-y-4 rounded-md border border-brand/30 bg-brand/5 p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">Pague com MB Way / Multibanco</p>
        <p className="mt-1 text-sm text-text-secondary">
          Leia o QR Code ou copie a referência abaixo. Se a confirmação automática não ocorrer,
          envie o comprovativo abaixo.
        </p>
      </div>

      <dl className="space-y-1 text-sm">
        {discountAmount > 0 && (
          <div className="flex justify-between gap-4 text-success">
            <dt>Desconto MB Way / Multibanco</dt>
            <dd className="font-medium tabular-nums">− {formatCurrency(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Total a pagar</dt>
          <dd className="font-bold tabular-nums text-brand">{formatCurrency(total)}</dd>
        </div>
      </dl>

      {displayImage && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt="QR Code de pagamento"
            className="size-56 rounded-md border border-border bg-white p-2"
          />
        </div>
      )}

      {qrCode && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Referência MB Way / Multibanco
          </p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary">
              {qrCode}
            </code>
            <Button type="button" variant="secondary" onClick={handleCopy} aria-label="Copiar referência de pagamento">
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            </Button>
          </div>
        </div>
      )}

      {expiresLabel && (
        <p className="text-xs text-text-muted">Expira em {expiresLabel}</p>
      )}

      <Alert type="info">
        {polling
          ? 'Aguardando confirmação do pagamento… esta página atualiza automaticamente.'
          : 'Após pagar, aguarde alguns instantes para a confirmação.'}
      </Alert>

      {onRefresh && (
        <Button type="button" variant="secondary" className="w-full" onClick={onRefresh}>
          Já paguei — verificar agora
        </Button>
      )}

      {orderId && (
        <div className="space-y-3 rounded-md border border-dashed border-brand/40 bg-surface p-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Enviar comprovativo</p>
            <p className="mt-1 text-xs text-text-secondary">
              Pagou e o estado não atualizou? Envie a imagem ou PDF do comprovativo para análise
              manual.
            </p>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-border bg-surface-muted px-4 py-6 text-center transition-colors hover:border-brand/40">
            <Upload className="size-5 text-brand" aria-hidden />
            <span className="text-sm font-medium text-text-primary">
              {uploading ? 'A enviar…' : 'Selecionar comprovativo'}
            </span>
            <span className="text-xs text-text-muted">JPEG, PNG, WebP, GIF ou PDF · máx. 5 MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                void handleProofUpload(file)
                e.target.value = ''
              }}
            />
          </label>

          {uploadError && <Alert type="error">{uploadError}</Alert>}
          {uploadSuccess && <Alert type="success">{uploadSuccess}</Alert>}

          {proof.uploadedAt && (
            <div className="rounded-md bg-success/10 px-3 py-2 text-xs text-success">
              Comprovativo recebido
              {proof.filename ? `: ${proof.filename}` : ''}. Em análise pela loja.
              {proof.previewUrl && proof.filename && !proof.filename.toLowerCase().endsWith('.pdf') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proof.previewUrl}
                  alt="Pré-visualização do comprovativo"
                  className="mt-2 max-h-40 rounded border border-border object-contain"
                />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
