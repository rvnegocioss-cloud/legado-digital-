'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    if (error) {
      setErro(error.message)
    } else {
      setEnviado(true)
    }
    setEnviando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Vale pra Central e pra Portal do Parceiro. Informe o e-mail da conta.
          </p>
        </div>

        {enviado ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-sm">
              Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha. Confira sua
              caixa de entrada (e o spam).
            </p>
            <Link href="/admin/login" className="text-blue-400 hover:underline text-sm block">
              Voltar pro login
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>

            {erro && <p className="text-red-400 text-sm">{erro}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg"
            >
              {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <div className="flex justify-between text-xs text-zinc-500">
              <Link href="/admin/login" className="hover:text-white">
                ← Voltar pra Central
              </Link>
              <Link href="/parceiro/login" className="hover:text-white">
                ← Voltar pro Parceiro
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
