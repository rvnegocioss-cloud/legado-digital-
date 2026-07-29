'use client'

import { useState } from 'react'
import { supabase } from '@/lib/auth'

export default function TrocarSenhaObrigatoria({ onConcluido }: { onConcluido: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

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
    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/parceiro/concluir-troca-senha', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    }).catch(() => {})

    setSalvando(false)
    onConcluido()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Mude seu login pra acessar a plataforma</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Você entrou com uma senha temporária. Crie uma senha nova pra continuar.
          </p>
        </div>

        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Nova senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoFocus
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
            {salvando ? 'Salvando...' : 'Salvar e entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
