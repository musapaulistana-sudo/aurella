'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginSchema } from '@/schemas/auth-schema'
import { CardAuth } from '@/components/auth/CardAuth'
import { fetchApi } from '@/lib/api/fetch-api'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/conta'
  const urlError = searchParams.get('error')
  const resetOk = searchParams.get('reset')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (urlError === 'admin_required') {
      setError('Sua conta não tem permissão de administrador. Verifique o e-mail promovido no Supabase.')
    } else if (urlError === 'link_invalido') {
      setError('Ligação inválida ou expirada. Solicite uma nova recuperação de palavra-passe.')
    }
  }, [urlError])

  useEffect(() => {
    if (resetOk === 'ok') {
      setInfo('Palavra-passe alterada com sucesso. Inicie sessão com a nova palavra-passe.')
    }
  }, [resetOk])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    setLoading(true)
    const { data, error: apiError } = await fetchApi<{
      ok: boolean
      role?: 'admin' | 'customer'
      redirectTo?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...parsed.data, redirect }),
    })
    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    router.push(data?.redirectTo ?? redirect)
    router.refresh()
  }

  return (
    <CardAuth title="Entrar na sua conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        {info && <Alert type="success">{info}</Alert>}
        {error && <Alert type="error">{error}</Alert>}
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          label="Palavra-passe"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link href="/conta/esqueci-senha" className="text-sm font-medium text-brand hover:underline">
            Esqueci a palavra-passe
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Não tem conta?{' '}
        <Link href="/conta/cadastro" className="font-medium text-brand hover:underline">
          Registe-se
        </Link>
      </p>
    </CardAuth>
  )
}
