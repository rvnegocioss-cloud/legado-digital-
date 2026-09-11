'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/auth'

export default function TrocarSenhaObrigatoria({ onConcluido }: { onConcluido: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [verConfirmarSenha, setVerConfirmarSenha] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--tema-zinc-950)] px-4">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Mude seu login pra acessar a plataforma</h1>
          <p className="text-[var(--tema-zinc-400)] text-sm mt-2">
            Você entrou com uma senha temporária. Crie uma senha nova pra continuar.
          </p>
        </div>

        <form onSubmit={salvar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--tema-zinc-300)]">Nova senha</label>
            <div className="relative mt-1">
              <input
                type={verSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2 pr-10 rounded-lg bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tema-zinc-500)] hover:text-white"
                aria-label={verSenha ? 'Esconder senha' : 'Ver senha'}
                tabIndex={-1}
              >
                {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tema-zinc-300)]">Confirmar nova senha</label>
            <div className="relative mt-1">
              <input
                type={verConfirmarSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 rounded-lg bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setVerConfirmarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tema-zinc-500)] hover:text-white"
                aria-label={verConfirmarSenha ? 'Esconder senha' : 'Ver senha'}
                tabIndex={-1}
              >
                {verConfirmarSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button
            type="submit"
            disabled={salvando}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-branco-fixo font-medium rounded-lg"
          >
            {salvando ? 'Salvando...' : 'Salvar e entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
