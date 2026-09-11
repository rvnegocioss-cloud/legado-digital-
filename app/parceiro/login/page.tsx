'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { signIn } from '@/lib/auth'
import FormularioLead from '@/components/public/FormularioLead'

export default function ParceiroLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/parceiro/memoriais')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Cadastro (metade clara) à esquerda no desktop; no celular o login vem
    // primeiro — por isso row-reverse em vez de trocar a ordem do JSX.
    <div className="min-h-screen flex flex-col lg:flex-row-reverse">
      <div className="flex-1 flex items-center justify-center px-10 py-14 bg-gradient-to-b from-[#0f2436] to-[#0B1D2A]">
        <div className="w-full max-w-[380px]">
          <Image
            src="/logo-legado-digital.svg"
            alt="Legado Digital"
            width={320}
            height={128}
            className="h-[86px] w-auto object-contain mb-6"
            priority
          />
          <h1 className="text-[26px] font-normal text-[#F5F2EB] mb-1.5">Portal do Parceiro</h1>
          <p className="text-sm text-[#7a8a96] mb-7">Acesso pra funerárias, cemitérios e demais parceiros.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email" className="block text-[11px] uppercase tracking-[1.6px] text-[#C9A46A] mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="contato@suaempresa.com.br"
              className="w-full px-3.5 py-3 rounded-lg mb-4 text-[15px] bg-white/5 border border-[rgba(201,164,106,0.2)] text-[#F5F2EB] placeholder-[#5c6b76] focus:outline-none focus:border-[#C9A46A]"
            />

            <label htmlFor="password" className="block text-[11px] uppercase tracking-[1.6px] text-[#C9A46A] mb-1.5">
              Senha
            </label>
            <div className="relative mb-4">
              <input
                id="password"
                type={verSenha ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-3 pr-10 rounded-lg text-[15px] bg-white/5 border border-[rgba(201,164,106,0.2)] text-[#F5F2EB] placeholder-[#5c6b76] focus:outline-none focus:border-[#C9A46A]"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5c6b76] hover:text-[#F5F2EB]"
                aria-label={verSenha ? 'Esconder senha' : 'Ver senha'}
                tabIndex={-1}
              >
                {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-[#C9A46A] hover:bg-[#dfc08a] disabled:opacity-60 text-[#0B1D2A] text-[15px] font-bold transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <Link href="/recuperar-senha" className="block text-center mt-3.5 text-[12.5px] text-[#7a8a96] hover:text-white">
              Esqueceu sua senha?
            </Link>
          </form>

          <Link href="/" className="block text-center mt-3.5 text-[12.5px] text-[#7a8a96] hover:text-white">
            Voltar pro site
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 py-14 bg-[#F7F5F0]">
        <FormularioLead tipo="parceiro" />
      </div>
    </div>
  )
}
