import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="py-12 md:py-16">
      <Suspense fallback={<p className="text-center text-text-secondary">A carregar…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
