import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const dir = dirname(fileURLToPath(import.meta.url))
const { pages } = JSON.parse(readFileSync(join(dir, 'pages.json'), 'utf8'))

for (const page of pages) {
  const meta = page.meta_description
    ? `'${page.meta_description.replace(/'/g, "''")}'`
    : 'NULL'
  const sql = `INSERT INTO footer_pages (slug, title, page_type, sort_order, content, active, show_in_footer, meta_description)
VALUES (
  '${page.slug}',
  '${page.title.replace(/'/g, "''")}',
  '${page.page_type}',
  ${page.sort_order},
  $content$${page.content}$content$,
  true,
  true,
  ${meta}
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  page_type = EXCLUDED.page_type,
  sort_order = EXCLUDED.sort_order,
  content = EXCLUDED.content,
  active = true,
  show_in_footer = true,
  meta_description = EXCLUDED.meta_description,
  updated_at = now();
`
  writeFileSync(join(dir, `dq-${page.slug}.sql`), sql)
  console.log(page.slug, sql.length)
}
