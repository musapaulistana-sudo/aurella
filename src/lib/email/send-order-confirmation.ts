import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency } from '@/lib/products/format'
import { getSiteUrl } from '@/lib/seo/site-url'
import {
  getOrderEmailFrom,
  getResendClient,
  getStoreContactEmail,
} from '@/lib/email/resend'

type OrderEmailRow = {
  id: string
  status: string
  payment_status: string | null
  payment_method: string | null
  total: number | string
  subtotal: number | string | null
  shipping_price: number | string | null
  discount_amount: number | string | null
  shipping_method_name: string | null
  customer_name: string | null
  customer_email: string | null
  user_id: string | null
  confirmation_email_sent_at: string | null
  created_at: string
  order_items?: Array<{
    quantity: number
    unit_price: number | string
    subtotal: number | string
    products?: { name?: string | null } | { name?: string | null }[] | null
  }>
}

function productName(products: unknown): string {
  if (!products) return 'Produto'
  const row = Array.isArray(products) ? products[0] : products
  if (!row || typeof row !== 'object') return 'Produto'
  const name = (row as { name?: string | null }).name
  return name?.trim() || 'Produto'
}

async function resolveCustomerEmail(order: OrderEmailRow): Promise<{
  email: string | null
  name: string
}> {
  const name = order.customer_name?.trim() || 'Cliente'
  if (order.customer_email?.trim()) {
    return { email: order.customer_email.trim().toLowerCase(), name }
  }

  if (!order.user_id) return { email: null, name }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('name')
    .eq('id', order.user_id)
    .maybeSingle()

  const { data: authUser, error } = await admin.auth.admin.getUserById(order.user_id)
  if (error || !authUser.user?.email) {
    return { email: null, name: profile?.name?.trim() || name }
  }

  return {
    email: authUser.user.email.toLowerCase(),
    name: profile?.name?.trim() || name,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildOrderEmailHtml(params: {
  storeName: string
  siteUrl: string
  customerName: string
  order: OrderEmailRow
  contactEmail: string
}): string {
  const shortId = params.order.id.slice(0, 8).toUpperCase()
  const items = params.order.order_items ?? []
  const itemRows = items
    .map((item) => {
      const name = productName(item.products)
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;color:#333;">${escapeHtml(name)} × ${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#333;">${escapeHtml(formatCurrency(Number(item.subtotal)))}</td>
      </tr>`
    })
    .join('')

  const discount = Number(params.order.discount_amount ?? 0)

  return `<!DOCTYPE html>
<html lang="pt-PT">
<body style="margin:0;padding:0;background:#f6f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #dddddd;">
          <tr>
            <td>
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#000000;font-weight:700;">${escapeHtml(params.storeName)}</p>
              <h1 style="margin:12px 0 8px;font-size:22px;color:#1a1a1a;">Encomenda confirmada</h1>
              <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5;">
                Olá, ${escapeHtml(params.customerName)}! Recebemos e confirmámos o pagamento da sua encomenda <strong>#${shortId}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                ${itemRows || '<tr><td style="padding:8px 0;color:#555;">Artigos da encomenda</td></tr>'}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:14px;color:#555;">
                ${
                  discount > 0
                    ? `<tr><td style="padding:4px 0;">Desconto</td><td style="padding:4px 0;text-align:right;">− ${escapeHtml(formatCurrency(discount))}</td></tr>`
                    : ''
                }
                ${
                  params.order.shipping_method_name
                    ? `<tr><td style="padding:4px 0;">Portes</td><td style="padding:4px 0;text-align:right;">${escapeHtml(params.order.shipping_method_name)} (${escapeHtml(formatCurrency(Number(params.order.shipping_price ?? 0)))})</td></tr>`
                    : ''
                }
                <tr>
                  <td style="padding:8px 0;font-weight:700;color:#1a1a1a;">Total</td>
                  <td style="padding:8px 0;text-align:right;font-weight:700;color:#000000;">${escapeHtml(formatCurrency(Number(params.order.total)))}</td>
                </tr>
              </table>
              <p style="margin:0 0 20px;">
                <a href="${escapeHtml(params.siteUrl)}" style="display:inline-block;background:#000000;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:700;">Visitar a loja</a>
              </p>
              <p style="margin:0;color:#777;font-size:12px;line-height:1.5;">
                Dúvidas? Contacte-nos em <a href="mailto:${escapeHtml(params.contactEmail)}" style="color:#000000;">${escapeHtml(params.contactEmail)}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export type SendOrderConfirmationResult =
  | { sent: true; email: string }
  | { sent: false; reason: string }

export async function sendOrderConfirmationEmail(
  orderId: string,
  options?: { force?: boolean }
): Promise<SendOrderConfirmationResult> {
  const resend = getResendClient()
  if (!resend) {
    return { sent: false, reason: 'RESEND_API_KEY não configurada' }
  }

  const siteUrl = getSiteUrl() ?? 'https://www.atlascosmeticos.com'
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select(
      `id, status, payment_status, payment_method, total, subtotal, shipping_price, discount_amount,
       shipping_method_name, customer_name, customer_email, user_id, confirmation_email_sent_at, created_at,
       order_items(quantity, unit_price, subtotal, products(name))`
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    return { sent: false, reason: 'Encomenda não encontrada' }
  }

  const row = order as OrderEmailRow
  const isPaid =
    row.payment_status === 'paid' ||
    ['confirmed', 'shipped', 'delivered'].includes(row.status)

  if (!isPaid) {
    return { sent: false, reason: 'Encomenda ainda não está confirmada/paga' }
  }

  if (row.confirmation_email_sent_at && !options?.force) {
    return { sent: false, reason: 'E-mail já enviado' }
  }

  const { email, name } = await resolveCustomerEmail(row)
  if (!email) {
    return { sent: false, reason: 'Encomenda sem e-mail do cliente' }
  }

  const { data: settings } = await admin
    .from('site_settings')
    .select('store_name')
    .limit(1)
    .maybeSingle()

  const storeName = settings?.store_name?.trim() || 'Atlas Cosmeticos'
  const contactEmail = getStoreContactEmail()
  const shortId = row.id.slice(0, 8).toUpperCase()

  const { error: sendError } = await resend.emails.send({
    from: getOrderEmailFrom(),
    to: email,
    replyTo: contactEmail,
    subject: `Encomenda #${shortId} confirmada — ${storeName}`,
    html: buildOrderEmailHtml({
      storeName,
      siteUrl,
      customerName: name,
      order: row,
      contactEmail,
    }),
  })

  if (sendError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[order-email]', sendError)
    }
    return { sent: false, reason: sendError.message || 'Falha no envio Resend' }
  }

  await admin
    .from('orders')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('id', orderId)

  return { sent: true, email }
}
