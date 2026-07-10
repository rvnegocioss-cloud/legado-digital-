'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Resultado {
  id: string
  nome_completo: string
  cidade: string | null
  foto_url: string | null
  slug: string | null
}

export default function FamiliaLoginPage() {
  const router = useRouter()
  const [aba, setAba] = useState<'email' | 'codigo'>('email')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  // Aba "código": passo 1 = busca pelo nome, passo 2 = digitar o código
  const [nomeBusca, setNomeBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [selecionado, setSelecionado] = useState<Resultado | null>(null)
  const [codigo, setCodigo] = useState('')

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

  async function buscarNome(e: React.FormEvent) {
    e.preventDefault()
    const nome = nomeBusca.trim()
    if (!nome) return
    setBuscando(true)
    setErro('')
    setSelecionado(null)

    const { data } = await supabase
      .from('homenagens_busca_publica')
      .select('id, nome_completo, cidade, foto_url, slug')
      .ilike('nome_completo', `%${nome}%`)
      .order('nome_completo')
      .limit(10)

    setResultados((data || []) as Resultado[])
    setBuscando(false)
  }

  async function entrarComCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado?.slug) return
    setEntrando(true)
    setErro('')

    const res = await fetch('/api/familia-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selecionado.slug, senha: codigo.trim() }),
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
        ) : !selecionado ? (
          <form onSubmit={buscarNome} className="space-y-3">
            <p className="text-xs text-zinc-500">
              Pra quem recebeu o código de acesso de outro familiar. Busque pelo nome do
              homenageado pra achar o memorial certo.
            </p>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Nome do homenageado</label>
              <input
                type="text"
                placeholder="Nome completo"
                value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={buscando}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>

            {resultados !== null && resultados.length === 0 && (
              <p className="text-zinc-500 text-sm">Nenhum memorial encontrado com esse nome.</p>
            )}

            {resultados && resultados.length > 0 && (
              <div className="space-y-2 pt-2">
                {resultados.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelecionado(r)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-left"
                  >
                    {r.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-800" />
                    )}
                    <div>
                      <div className="text-sm text-white">{r.nome_completo}</div>
                      {r.cidade && <div className="text-xs text-zinc-500">{r.cidade}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={entrarComCodigo} className="space-y-3">
            <button
              type="button"
              onClick={() => { setSelecionado(null); setCodigo(''); setErro('') }}
              className="text-xs text-zinc-500 hover:text-white"
            >
              ← Buscar outro nome
            </button>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
              {selecionado.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selecionado.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-zinc-800" />
              )}
              <div className="text-sm text-white">{selecionado.nome_completo}</div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Código de acesso</label>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                autoFocus
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
