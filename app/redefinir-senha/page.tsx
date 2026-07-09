'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

export default function RedefinirSenhaPage() {
  const [pronto, setPronto] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPronto(true)
    })

    // Se o link já processou a sessão antes desse componente montar
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais')
      return
    }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }
    setSalvo(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
        </div>

        {salvo ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-sm">Senha alterada. Já pode entrar de novo.</p>
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/admin/login" className="text-blue-400 hover:underline">Central</Link>
              <Link href="/parceiro/login" className="text-blue-400 hover:underline">Parceiro</Link>
            </div>
          </div>
        ) : !pronto ? (
          <p className="text-zinc-400 text-sm text-center">
            Abra essa página pelo link recebido por e-mail. Se você chegou aqui direto, o link
            pode ter expirado — peça um novo em{' '}
            <Link href="/recuperar-senha" className="text-blue-400 hover:underline">
              recuperar senha
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300">Nova senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button
              type="submit"
              disabled={salvando}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg"
            >
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
