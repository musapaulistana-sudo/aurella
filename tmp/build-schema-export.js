const fs = require('fs')
const path = require('path')

const parts = [
  'PARTE_1_tabelas.sql',
  'PARTE_2_seguranca_profiles.sql',
  'PARTE_3_rls_policies.sql',
  'PARTE_4_storage.sql',
  'PARTE_6_fix_signup.sql',
  'PARTE_8_fix_admin_promotion.sql',
  'PARTE_9_products_media.sql',
  'PARTE_10_payment_settings.sql',
  'PARTE_11_home_banners.sql',
  'PARTE_5_seed_layout.sql',
  'PARTE_12_footer_system.sql',
  'PARTE_13_shipping_methods.sql',
  'PARTE_14_collection_fields.sql',
  'PARTE_14b_merge_seal_into_image.sql',
  'PARTE_15_banner_device_target.sql',
  'PARTE_12_woocommerce_import.sql',
]

let sql = parts
  .map((f) => fs.readFileSync(path.join('supabase/sql', f), 'utf8'))
  .join('\n\n')

// Skip hardcoded admin promotion (no users on new project)
sql = sql.replace(
  /INSERT INTO public\.profiles[\s\S]*?admin@gmail\.com'\);/gi,
  '-- skipped admin promote'
)
sql = sql.replace(
  /SELECT u\.email[\s\S]*?admin@gmail\.com'\);/gi,
  '-- skipped admin verify'
)

fs.mkdirSync('tmp/schema-export', { recursive: true })

// Split core into smaller chunks for MCP apply_migration limits
const chunkSize = 12000
const coreChunks = []
for (let i = 0; i < sql.length; i += chunkSize) {
  // try to split on double newline near boundary
  let end = Math.min(i + chunkSize, sql.length)
  if (end < sql.length) {
    const nl = sql.lastIndexOf('\n\n', end)
    if (nl > i + 2000) end = nl
  }
  coreChunks.push(sql.slice(i, end))
  i = end - 1
}

coreChunks.forEach((chunk, idx) => {
  fs.writeFileSync(
    path.join('tmp/schema-export', `01_core_${String(idx + 1).padStart(2, '0')}.sql`),
    chunk
  )
})
console.log('core chunks', coreChunks.length, 'total', Buffer.byteLength(sql))

const migs = fs
  .readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort()

migs.forEach((f, idx) => {
  const content = fs.readFileSync(path.join('supabase/migrations', f), 'utf8')
  fs.writeFileSync(
    path.join(
      'tmp/schema-export',
      `02_mig_${String(idx + 1).padStart(2, '0')}_${f}`
    ),
    content
  )
})
console.log('migration files', migs.length)

const storageExtra = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
`
fs.writeFileSync('tmp/schema-export/03_storage_extra.sql', storageExtra)
console.log('done')
