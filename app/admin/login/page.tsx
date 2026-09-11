'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { signIn, supabase } from '@/lib/auth'

// Escopos pedidos no mesmo clique do login -- e-mail/agenda/drive da própria
// pessoa, nunca de outro staff (regra do Rafael, 2026-09-11: "não quero ver
// a caixa do meu sócio"). O Supabase não guarda o token do Google sozinho
// (confirmado na doc oficial) -- por isso o useEffect abaixo salva na mão.
const ESCOPOS_GOOGLE =
  'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [entrandoComGoogle, setEntrandoComGoogle] = useState(false)
  const router = useRouter()

  // Depois do Google mandar a pessoa de volta pra esta mesma página, o
  // Supabase já resolveu o login sozinho (detecta o retorno na URL) -- este
  // efeito só pega o token do Google que veio junto, salva na conta de quem
  // acabou de logar, e só então segue pra Central.
  useEffect(() => {
    const { data: assinatura } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.provider_token) return
      try {
        await fetch('/api/admin/google-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            providerToken: session.provider_token,
            providerRefreshToken: session.provider_refresh_token,
            escopos: ESCOPOS_GOOGLE,
          }),
        })
      } catch {
        // Login já aconteceu de verdade -- se salvar o token falhar, a pessoa
        // ainda assim entra na Central, só sem o ambiente Google ativo ainda.
      }
      router.push('/admin')
    })
    return () => assinatura.subscription.unsubscribe()
  }, [router])

  async function entrarComGoogle() {
    setError('')
    setEntrandoComGoogle(true)
    const { error: erroGoogle } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/login`,
        scopes: ESCOPOS_GOOGLE,
        queryParams: { access_type: 'offline', prompt: 'consent', hd: 'legadodigital.net' },
      },
    })
    if (erroGoogle) {
      setError(erroGoogle.message)
      setEntrandoComGoogle(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/admin')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tema-zinc-950)]">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={320} height={128} className="mx-auto h-28 w-auto object-contain mb-4" priority />
          <h1 className="text-xl font-bold text-white">Central</h1>
          <p className="text-[var(--tema-zinc-400)] mt-2">Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--tema-zinc-300)]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 rounded-lg bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white placeholder-[var(--tema-zinc-500)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@legadodigital.com.br"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--tema-zinc-300)]">
              Senha
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={verSenha ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 rounded-lg bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white placeholder-[var(--tema-zinc-500)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tema-zinc-500)] hover:text-white"
                aria-label={verSenha ? 'Esconder senha' : 'Ver senha'}
                tabIndex={-1}
              >
                {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-branco-fixo font-medium rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <Link href="/recuperar-senha" className="block text-center text-xs text-[var(--tema-zinc-500)] hover:text-white">
            Esqueceu sua senha?
          </Link>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--tema-zinc-800)]" />
          <span className="text-[var(--tema-zinc-600)] text-xs">ou</span>
          <div className="flex-1 h-px bg-[var(--tema-zinc-800)]" />
        </div>

        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={entrandoComGoogle}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-900)] hover:bg-[var(--tema-zinc-800)] disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          {entrandoComGoogle ? 'Redirecionando...' : 'Entrar com Google'}
        </button>
        <p className="text-center text-[10.5px] text-[var(--tema-zinc-600)]">
          Só contas @legadodigital.net conseguem entrar por aqui
        </p>

        <Link href="/" className="block text-center text-xs text-[var(--tema-zinc-500)] hover:text-white">
          ← Voltar pro site
        </Link>
      </div>
    </div>
  )
}