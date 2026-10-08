import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const DEST_URL = 'https://mxslkryqrtrlclmcjvlb.supabase.co'
const SRC_HOST = 'kktzfayiojgsgqdvdazd.supabase.co'
const DEST_HOST = 'mxslkryqrtrlclmcjvlb.supabase.co'
const dest = createClient(DEST_URL, process.env.DEST_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const CACHE = 'd:/atlascosmeticos/_migrate_tmp/data'
const load = (t) => JSON.parse(readFileSync(join(CACHE, t + '.json'), 'utf8'))
const rewriteUrl = (u) =>
  typeof u === 'string' && u ? u.split(SRC_HOST).join(DEST_HOST) : u

const STORE = {
  store_name: 'Reis Cosmeticos',
  logo_brand: 'Reis',
  logo_suffix: 'Cosmeticos',
  logo_tagline: null,
  company_legal_name: '69.459.781 RICHARD REIS DOS SANTOS',
  cnpj: '69.459.781/0001-83',
  contact_email: 'atendimento@reiscosmeticos.com.br',
  phone_area_code: '(31) ',
  phone_number: '9731-20260',
  phone_href: 'tel:+5531973120260',
  contact_whatsapp_href: 'https://wa.me/5531973120260',
  contact_whatsapp_label: 'WhatsApp',
  contact_address:
    'Rua Conceicao do Para, 460 - Santa Ines - Belo Horizonte - Minas Gerais - Cep: 31060-090',
  store_street: 'Rua Conceicao do Para',
  store_street_number: '460',
  store_neighborhood: 'Santa Ines',
  store_city: 'Belo Horizonte',
  store_state: 'MG',
  store_postal_code: '31060-090',
  store_country: 'BR',
  store_complement: null,
  seo_title: 'Reis Cosmeticos',
  seo_title_template: '%s | Reis Cosmeticos',
  seo_description: 'Reis Cosmeticos — produtos de beleza e cuidados.',
  logo_image_url: null,
  favicon_url: null,
  seo_og_image_url: null,
  google_analytics_id: null,
  google_tag_manager_id: null,
  google_ads_id: null,
  google_ads_conversion_id: null,
  microsoft_clarity_id: null,
  head_scripts: null,
  tracking_tags: [],
}

function rewriteAtlas(t) {
  if (typeof t !== 'string' || !t) return t
  return t
    .replace(/Atlas Cosmeticos/gi, 'Reis Cosmeticos')
    .replace(/Atlas Cosméticos/gi, 'Reis Cosméticos')
    .replace(/ATLAS NEGOCIOS INTEGRADOS LTDA/gi, STORE.company_legal_name)
    .replace(/67\.006\.230\/0001-39/g, STORE.cnpj)
    .replace(/atendimento@atlascosmeticos\.com/gi, STORE.contact_email)
    .replace(/Avenida Portugal, 1148[^<"]*/gi, STORE.contact_address)
}

async function upsert(table, rows, onConflict = 'id') {
  for (let i = 0; i < rows.length; i += 200) {
    const part = rows.slice(i, i + 200)
    const { error } = await dest.from(table).upsert(part, { onConflict })
    if (error) throw new Error(table + ': ' + error.message)
  }
  console.log(table, rows.length)
}

const base = load('site_settings')[0]
const settings = {
  ...base,
  ...STORE,
  logo_image_url: null,
  favicon_url: null,
  seo_og_image_url: null,
  google_analytics_id: null,
  google_tag_manager_id: null,
  google_ads_id: null,
  google_ads_conversion_id: null,
  microsoft_clarity_id: null,
  head_scripts: null,
  tracking_tags: [],
  buy_together_settings: base.buy_together_settings || {},
  store_description: rewriteAtlas(base.store_description) || 'Reis Cosmeticos',
  footer_security_text: rewriteAtlas(base.footer_security_text),
  footer_disclaimers: Array.isArray(base.footer_disclaimers)
    ? base.footer_disclaimers.map((d) => (typeof d === 'string' ? rewriteAtlas(d) : d))
    : [],
  updated_at: new Date().toISOString(),
}
await upsert('site_settings', [settings])

const footer = load('footer_pages').map((p) => ({
  ...p,
  content: rewriteAtlas(p.content),
  title: rewriteAtlas(p.title),
  meta_description: rewriteAtlas(p.meta_description),
}))
await upsert('footer_pages', footer)
await upsert('policy_links', load('policy_links'))

const social = load('social_links').map((s) =>
  s.type === 'whatsapp'
    ? {
        ...s,
        href: STORE.contact_whatsapp_href,
        display: STORE.phone_area_code + STORE.phone_number,
        label: 'WhatsApp',
      }
    : s,
)
await upsert('social_links', social)

const menus = load('menu_items')
await upsert(
  'menu_items',
  menus.filter((m) => !m.parent_id),
)
await upsert(
  'menu_items',
  menus.filter((m) => m.parent_id),
)
await upsert('footer_menus', load('footer_menus'))
await upsert('footer_menu_items', load('footer_menu_items'))
await upsert(
  'footer_assets',
  load('footer_assets').map((a) => ({ ...a, image_url: rewriteUrl(a.image_url) })),
)
await upsert('shipping_methods', load('shipping_methods'))
await dest
  .from('home_banners')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000')

const ADMIN = {
  email: 'admin@reiscosmeticos.com.br',
  password: 'ReisAdmin2026!',
  name: 'Admin Reis',
}
const { data: listed } = await dest.auth.admin.listUsers({ perPage: 200 })
let user = listed?.users?.find((u) => u.email?.toLowerCase() === ADMIN.email)
if (!user) {
  const { data, error } = await dest.auth.admin.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    email_confirm: true,
    user_metadata: { name: ADMIN.name },
  })
  if (error) throw error
  user = data.user
  console.log('created user', user.id)
} else {
  await dest.auth.admin.updateUserById(user.id, {
    password: ADMIN.password,
    email_confirm: true,
    user_metadata: { name: ADMIN.name },
  })
  console.log('updated user', user.id)
}
const { error: pErr } = await dest
  .from('profiles')
  .upsert({ id: user.id, name: ADMIN.name, role: 'admin' }, { onConflict: 'id' })
if (pErr) throw pErr
console.log('admin ok')

for (const t of [
  'products',
  'footer_pages',
  'menu_items',
  'site_settings',
  'profiles',
  'home_banners',
  'shipping_methods',
]) {
  const { count } = await dest.from(t).select('*', { count: 'exact', head: true })
  console.log(t, count)
}
const { data: ss } = await dest
  .from('site_settings')
  .select(
    'store_name,cnpj,contact_email,company_legal_name,logo_image_url,google_ads_id,contact_address',
  )
  .limit(1)
  .maybeSingle()
console.log(ss)
console.log('ADMIN', ADMIN.email, ADMIN.password)
