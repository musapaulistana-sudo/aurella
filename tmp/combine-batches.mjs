import { readdirSync, readFileSync, writeFileSync } from 'fs'

const files = readdirSync('d:/cosmeticospt/tmp')
  .filter((f) => /^chunk-\d+\.sql$/.test(f))
  .sort()

let batch = []
let batches = []
let size = 0
for (const f of files) {
  const sql = readFileSync(`d:/cosmeticospt/tmp/${f}`, 'utf8')
  if (size + sql.length > 18000 && batch.length) {
    batches.push(batch.join('\n'))
    batch = [sql]
    size = sql.length
  } else {
    batch.push(sql)
    size += sql.length
  }
}
if (batch.length) batches.push(batch.join('\n'))

batches.forEach((b, i) => writeFileSync(`d:/cosmeticospt/tmp/batch-${i}.sql`, b))
console.log(
  'batches',
  batches.length,
  batches.map((b) => b.length)
)
