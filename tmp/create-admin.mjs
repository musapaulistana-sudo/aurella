import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'

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
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = 'admin@aurellecosmeticos.pt'
const password = `Au${randomBytes(4).toString('hex')}!${randomBytes(2).toString('hex')}`
const name = 'Administrador'

async function main() {
  // Check existing users with this email
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) throw listError

  const existing = listed.users.find((u) => u.email?.toLowerCase() === email)

  let userId = existing?.id ?? null

  if (existing) {
    const { error: updError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (updError) throw updError
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) throw error
    userId = data.user.id
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      name,
      role: 'admin',
    })
    if (insertError) throw insertError
  } else if (profile.role !== 'admin') {
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'admin', name })
      .eq('id', userId)
    if (roleError) throw roleError
  }

  console.log(JSON.stringify({ email, password, userId, created: !existing }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
