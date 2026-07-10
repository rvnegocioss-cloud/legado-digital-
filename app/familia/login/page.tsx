'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FamiliaLoginPage() {
  const router = useRouter()
  const [aba, setAba] = useState<'email' | 'codigo'>('email')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [slug, setSlug] = useState('')
  const [codigo, setCodigo] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrarComEmail(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro('')

    const res = await fetch('/api/familia-login-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), senha }),
    })
    const json = await res.json()

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Não foi possível entrar')
      setEntrando(false)
      return
    }
    router.push(`/familia/${json.slug}`)
  }

  async function entrarComCodigo(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setErro('')

    const res = await fetch('/api/familia-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug.trim(), senha: codigo.trim() }),
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
        <p className="text-zinc-400 text-sm mb-5">
          Adicione fotos, vídeo e a história de quem você ama.
        </p>

        <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => { setAba('email'); setErro('') }}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              aba === 'email' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Sou o responsável
          </button>
          <button
            type="button"
            onClick={() => { setAba('codigo'); setErro('') }}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              aba === 'codigo' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            Tenho um código
          </button>
        </div>

        {aba === 'email' ? (
          <form onSubmit={entrarComEmail} className="space-y-3">
            <p className="text-xs text-zinc-500">
              Pra quem recebeu o convite por e-mail da funerária ou da Legado Digital.
            </p>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Senha</label>
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
          </form>
        ) : (
          <form onSubmit={entrarComCodigo} className="space-y-3">
            <p className="text-xs text-zinc-500">
              Pra quem recebeu o código de acesso de outro familiar.
            </p>
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
              <label className="block text-xs text-zinc-500 mb-1">Código de acesso</label>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
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
          </form>
        )}

        <p className="text-center text-xs text-zinc-600 mt-4">
          Esqueceu a senha ou o código? Fale com quem cadastrou o memorial (a funerária ou a
          Legado Digital).
        </p>
      </div>
    </div>
  )
}
