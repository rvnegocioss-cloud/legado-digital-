'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FamiliaLoginPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro('')

    const res = await fetch('/api/familia-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), senha }),
    })
    const json = await res.json()

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Não foi possível entrar')
      setEntrando(false)
      return
    }

    router.push(`/familia/${json.slug}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-1">Portal da Família</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Entre com o endereço do memorial e a senha de edição que a funerária ou a Legado Digital
          te passou pra adicionar fotos, vídeo e a história de quem você ama.
        </p>
        <form onSubmit={entrar} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Endereço do memorial</label>
            <input
              type="text"
              placeholder="ex: maria-da-silva"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600"
            />
            <p className="text-[11px] text-zinc-600 mt-1">
              É a parte final do link — em legadodigital.com/homenagem/<b>maria-da-silva</b>, seria &ldquo;maria-da-silva&rdquo;.
            </p>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Senha de edição</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600"
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button
            type="submit"
            disabled={entrando}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg"
          >
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
          <p className="text-center text-xs text-zinc-600">
            Esqueceu a senha? Esse acesso não usa e-mail — fale com quem cadastrou o memorial
            (a funerária ou a Legado Digital) pra pedir uma senha nova.
          </p>
        </form>
      </div>
    </div>
  )
}
