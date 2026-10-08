export type Track7Customer = {
  name: string
  email: string
  phone: string
  document: string
}

export type Track7Address = {
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
  zipcode: string
}

export type Track7Product = {
  name: string
  quantity: number
  price: number
}

export type Track7CreateOrderPayload = {
  transaction_id: string
  currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'MXN'
  customer: Track7Customer
  address: Track7Address
  products: Track7Product[]
  total: number
}

export type Track7TrackingEvent = {
  date: string
  location: string
  status: string
  description: string
}

export type Track7TrackingData = {
  transaction_id: string | null
  tracking_code: string | null
  status: string | null
  current_status: string | null
  events: Track7TrackingEvent[]
}

export class Track7Error extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMIT' | 'CONFIG' | 'UPSTREAM' | 'INVALID'
  ) {
    super(message)
    this.name = 'Track7Error'
  }
}

const DEFAULT_TRACK7_API_URL = 'https://track7.app/api/v1'
const TRACK7_TIMEOUT_MS = 12_000

/** Hosts conhecidos que não respondem (timeout) — redireciona para a URL oficial. */
const BROKEN_TRACK7_HOSTS = ['api.track7.com.br', 'api.track7.app']

function getTrack7Config() {
  const apiKey = process.env.TRACK7_API_KEY?.trim()
  let raw = process.env.TRACK7_API_URL?.trim() || DEFAULT_TRACK7_API_URL
  try {
    const host = new URL(raw).hostname.toLowerCase()
    if (BROKEN_TRACK7_HOSTS.includes(host)) {
      raw = DEFAULT_TRACK7_API_URL
    }
  } catch {
    raw = DEFAULT_TRACK7_API_URL
  }
  const baseUrl = raw.replace(/\/+$/, '')
  return { apiKey, baseUrl }
}

export function isTrack7Configured(): boolean {
  return Boolean(getTrack7Config().apiKey)
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback
  const row = json as Record<string, unknown>
  if (typeof row.message === 'string' && row.message.trim()) return row.message.trim()
  if (typeof row.error === 'string' && row.error.trim()) return row.error.trim()
  if (row.error && typeof row.error === 'object') {
    const nested = row.error as Record<string, unknown>
    if (typeof nested.message === 'string' && nested.message.trim()) return nested.message.trim()
  }
  return fallback
}

async function track7Fetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { apiKey, baseUrl } = getTrack7Config()
  if (!apiKey) {
    throw new Track7Error('Rastreio indisponível no momento', 503, 'CONFIG')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TRACK7_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...init?.headers,
      },
      cache: 'no-store',
    })
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === 'AbortError') ||
      (typeof e === 'object' && e !== null && 'name' in e && (e as { name: string }).name === 'AbortError')
    if (process.env.NODE_ENV === 'development') {
      console.error('[track7]', aborted ? 'timeout' : 'network', baseUrl + path, e)
    }
    throw new Track7Error(
      aborted
        ? 'O serviço de rastreio demorou para responder. Tente novamente em instantes.'
        : 'Não foi possível conectar ao serviço de rastreio. Verifique TRACK7_API_URL (use https://track7.app/api/v1).',
      503,
      'UPSTREAM'
    )
  } finally {
    clearTimeout(timeout)
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (res.status === 401) {
    throw new Track7Error('Falha na autenticação do rastreio. Confira TRACK7_API_KEY.', 401, 'UNAUTHORIZED')
  }
  if (res.status === 404) {
    throw new Track7Error(
      'Encomenda não encontrada. Confira o código ou aguarde a expedição.',
      404,
      'NOT_FOUND'
    )
  }
  if (res.status === 429) {
    throw new Track7Error(
      'Muitas consultas em pouco tempo. Tente novamente em instantes.',
      429,
      'RATE_LIMIT'
    )
  }

  if (!res.ok) {
    throw new Track7Error(
      readErrorMessage(json, 'Não foi possível consultar o rastreio'),
      res.status >= 400 && res.status < 600 ? res.status : 502,
      'UPSTREAM'
    )
  }

  return json as T
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeEvents(raw: unknown): Track7TrackingEvent[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = asRecord(item)
      if (!row) return null
      return {
        date: readString(row.date) ?? '',
        location: readString(row.location) ?? '',
        status: readString(row.status) ?? '',
        description: readString(row.description) ?? readString(row.status) ?? '',
      }
    })
    .filter((event): event is Track7TrackingEvent => event != null)
}

export function normalizeTrack7TrackingPayload(payload: unknown): Track7TrackingData {
  const root = asRecord(payload)
  const data = asRecord(root?.data) ?? root
  if (!data) {
    return {
      transaction_id: null,
      tracking_code: null,
      status: null,
      current_status: null,
      events: [],
    }
  }

  return {
    transaction_id: readString(data.transaction_id),
    tracking_code: readString(data.tracking_code),
    status: readString(data.status),
    current_status: readString(data.current_status) ?? readString(data.status),
    events: normalizeEvents(data.events),
  }
}

export async function getTrackingByCode(trackingCode: string): Promise<Track7TrackingData> {
  const code = trackingCode.trim()
  if (!code) {
    throw new Track7Error('Informe um código de rastreio válido', 400, 'INVALID')
  }
  const json = await track7Fetch<unknown>(`/tracking/${encodeURIComponent(code)}`)
  return normalizeTrack7TrackingPayload(json)
}

export async function getTrackingByOrderId(transactionId: string): Promise<Track7TrackingData> {
  const id = transactionId.trim()
  if (!id) {
    throw new Track7Error('Indique um ID de encomenda válido', 400, 'INVALID')
  }
  const json = await track7Fetch<unknown>(`/orders/${encodeURIComponent(id)}/tracking`)
  return normalizeTrack7TrackingPayload(json)
}

export async function createTrack7Order(
  payload: Track7CreateOrderPayload
): Promise<{ trackingCode: string | null; raw: unknown }> {
  const json = await track7Fetch<unknown>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const normalized = normalizeTrack7TrackingPayload(json)
  const root = asRecord(json)
  const data = asRecord(root?.data) ?? root
  const trackingCode =
    normalized.tracking_code ??
    readString(data?.tracking_code) ??
    readString(data?.code) ??
    null

  return { trackingCode, raw: json }
}
