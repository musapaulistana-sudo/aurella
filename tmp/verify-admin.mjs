import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2]
    const hash = v.indexOf('#')
    if (hash >= 0 && !v.trimStart().startsWith('"')) v = v.slice(0, hash).trimEnd()
    env[m[1]] = v.replace(/^["']|["']$/g, '')
  }
  return env
}

const env = loadEnv()
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const id = '83824d4e-1b4d-48af-ba55-735f487bc05f'

const { data, error } = await sb.from('profiles').select('id,name,role').eq('id', id).maybeSingle()
console.log('profile', { data, error })

if (!data) {
  const ins = await sb.from('profiles').insert({ id, name: 'Administrador', role: 'admin' }).select()
  console.log('insert', ins)
} else if (data.role !== 'admin') {
  const upd = await sb.from('profiles').update({ role: 'admin' }).eq('id', id).select('id,role')
  console.log('promote', upd)
}
