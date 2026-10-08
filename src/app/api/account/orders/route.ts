import { createClient } from '@/lib/supabase/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getSessionUser } from '@/lib/auth/verify-session'
import { getPrimaryProductImage } from '@/lib/products/product-images'

const ORDER_COLUMNS =
  'id, status, payment_status, payment_method, total, subtotal, shipping_price, discount_amount, shipping_method_name, tracking_code, track7_last_status, customer_name, notes, created_at, updated_at, shipping_address, address_id'

const ORDER_ITEM_COLUMNS =
  'id, product_id, quantity, unit_price, subtotal, products(name, slug, product_images(sort_order, media:media_assets(public_url, alt_text)))'

const ADDRESS_COLUMNS =
  'street, number, complement, neighborhood, city, state, zip_code'

const ORDER_ITEM_COLUMNS_LEGACY =
  'id, product_id, quantity, unit_price, subtotal, products(name, slug)'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return jsonError('Não autorizado', 401, 'UNAUTHORIZED')
  }

  const supabase = await createClient()
  let { data, error } = await supabase
    .from('orders')
    .select(
      `${ORDER_COLUMNS}, addresses(${ADDRESS_COLUMNS}), order_items(${ORDER_ITEM_COLUMNS})`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    const legacy = await supabase
      .from('orders')
      .select(
        `id, status, total, created_at, order_items(${ORDER_ITEM_COLUMNS_LEGACY})`
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (legacy.error) {
      return jsonError('Não foi possível carregar os pedidos', 500)
    }
    data = legacy.data as typeof data
    error = null
  }

  const orders = (data ?? []).map((order) => {
    const items = Array.isArray(order.order_items) ? order.order_items : []
    const mappedItems = items.map((item) => {
      const products = item.products
      const product = Array.isArray(products) ? products[0] : products
      const image = getPrimaryProductImage(
        product && typeof product === 'object' && 'product_images' in product
          ? (product as { product_images?: unknown }).product_images
          : null,
        product && typeof product === 'object' && 'name' in product
          ? String((product as { name?: string }).name ?? '')
          : undefined
      )

      return {
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        name:
          product && typeof product === 'object' && 'name' in product
            ? ((product as { name?: string | null }).name ?? 'Produto')
            : 'Produto',
        slug:
          product && typeof product === 'object' && 'slug' in product
            ? ((product as { slug?: string | null }).slug ?? null)
            : null,
        image_url: image.url,
      }
    })

    const addressJoinRaw = (order as { addresses?: unknown }).addresses
    const addressJoin =
      addressJoinRaw && typeof addressJoinRaw === 'object' && !Array.isArray(addressJoinRaw)
        ? (addressJoinRaw as {
            street?: string
            number?: string
            complement?: string | null
            neighborhood?: string
            city?: string
            state?: string
            zip_code?: string
          })
        : null
    const shippingJson =
      order.shipping_address && typeof order.shipping_address === 'object'
        ? (order.shipping_address as Record<string, unknown>)
        : null

    const address = addressJoin
      ? {
          street: addressJoin.street ?? '',
          number: addressJoin.number ?? '',
          complement: addressJoin.complement ?? null,
          neighborhood: addressJoin.neighborhood ?? '',
          city: addressJoin.city ?? '',
          state: addressJoin.state ?? '',
          zip_code: addressJoin.zip_code ?? '',
        }
      : shippingJson
        ? {
            street: String(shippingJson.street ?? ''),
            number: String(shippingJson.number ?? ''),
            complement:
              typeof shippingJson.complement === 'string' ? shippingJson.complement : null,
            neighborhood: String(shippingJson.neighborhood ?? ''),
            city: String(shippingJson.city ?? ''),
            state: String(shippingJson.state ?? ''),
            zip_code: String(shippingJson.zip_code ?? ''),
          }
        : null

    return {
      id: order.id,
      status: order.status,
      payment_status: 'payment_status' in order ? order.payment_status : null,
      payment_method: 'payment_method' in order ? order.payment_method : null,
      total: order.total,
      subtotal: 'subtotal' in order ? order.subtotal : null,
      shipping_price: 'shipping_price' in order ? order.shipping_price : null,
      discount_amount: 'discount_amount' in order ? order.discount_amount : null,
      shipping_method_name:
        'shipping_method_name' in order ? order.shipping_method_name : null,
      tracking_code: 'tracking_code' in order ? order.tracking_code : null,
      track7_last_status: 'track7_last_status' in order ? order.track7_last_status : null,
      created_at: order.created_at,
      address,
      order_items: mappedItems,
    }
  })

  return jsonSuccess(orders)
}
