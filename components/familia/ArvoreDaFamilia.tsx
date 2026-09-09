'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

// Vocabulário fechado de propósito: o desenho da árvore só sabe posicionar
// quem cabe numa dessas caixas (regra 23 -- convenção genealógica tradicional).
// A ordem aqui é a ordem que aparece no select, das gerações mais antigas
// pras mais novas.
const TIPOS = [
  { id: 'avo_paterno', nome: 'Avô paterno (pai do pai)' },
  { id: 'avo_paterna', nome: 'Avó paterna (mãe do pai)' },
  { id: 'avo_materno', nome: 'Avô materno (pai da mãe)' },
  { id: 'avo_materna', nome: 'Avó materna (mãe da mãe)' },
  { id: 'pai', nome: 'Pai' },
  { id: 'mae', nome: 'Mãe' },
  { id: 'conjuge', nome: 'Cônjuge (esposo ou esposa)' },
  { id: 'irmao', nome: 'Irmão' },
  { id: 'irma', nome: 'Irmã' },
  { id: 'filho', nome: 'Filho' },
  { id: 'filha', nome: 'Filha' },
  { id: 'neto', nome: 'Neto' },
  { id: 'neta', nome: 'Neta' },
] as const

const ROTULO: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.id, t.nome.replace(/ \(.*\)$/, '')])
)

// Ordem de nascimento só faz sentido entre quem disputa posição na mesma
// linha: é o que coloca o mais velho à esquerda.
const PEDE_ORDEM = ['filho', 'filha', 'irmao', 'irma']

// Só o cônjuge tem união -- é o que decide linha sólida (casamento) ou
// pontilhada (separação) no desenho.
const PEDE_UNIAO = ['conjuge']

interface Parente {
  id: string
  tipo: string
  uniao: string | null
  ordem: number | null
  nome: string
  slug: string | null
  tem_memorial: boolean
  nascimento: number | null
  falecimento: number | null
}

const FORM_VAZIO = {
  nome: '',
  tipo: '',
  uniao: 'casamento',
  ordem_nascimento: '',
  ano_nascimento: '',
  ano_falecimento: '',
}

export default function ArvoreDaFamilia({ slug }: { slug: string }) {
  const [parentes, setParentes] = useState<Parente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    const res = await fetch(`/api/familia-parentescos?slug=${encodeURIComponent(slug)}`)
    const json = await res.json().catch(() => ({}))
    setParentes(json?.arvore?.parentes || [])
    setCarregando(false)
  }, [slug])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const res = await fetch('/api/familia-parentescos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...form }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Não foi possível salvar agora')
      setSalvando(false)
      return
    }

    setForm(FORM_VAZIO)
    setSalvando(false)
    carregar()
  }

  async function remover(id: string, nome: string) {
    if (!confirm(`Tirar ${nome} da árvore da família?`)) return
    await fetch(`/api/familia-parentescos?slug=${encodeURIComponent(slug)}&id=${id}`, {
      method: 'DELETE',
    })
    carregar()
  }

  function anos(p: Parente) {
    if (p.nascimento && p.falecimento) return `${p.nascimento} — ${p.falecimento}`
    if (p.nascimento) return `${p.nascimento}`
    if (p.falecimento) return `— ${p.falecimento}`
    return ''
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-1">
        Árvore da família
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Quem cadastrar aqui aparece na árvore da página do memorial. O parentesco é sempre em
        relação a {' '}
        <span className="text-zinc-400">quem o memorial homenageia</span> — não precisa ter memorial
        próprio pra entrar.
      </p>

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : parentes.length === 0 ? (
        <p className="text-sm text-zinc-500 mb-4">Ninguém cadastrado ainda.</p>
      ) : (
        <ul className="mb-5 divide-y divide-zinc-800">
          {parentes.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-[#C9A46A]">
                  {ROTULO[p.tipo] || p.tipo}
                  {p.ordem ? ` · ${p.ordem}º` : ''}
                </span>
                <span className="block text-sm text-white truncate">{p.nome}</span>
                {(anos(p) || p.tem_memorial) && (
                  <span className="block text-[11px] text-zinc-500">
                    {anos(p)}
                    {anos(p) && p.tem_memorial ? ' · ' : ''}
                    {p.tem_memorial ? 'tem memorial' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remover(p.id, p.nome)}
                className="shrink-0 text-zinc-500 hover:text-red-400"
                aria-label={`Remover ${p.nome}`}
                title="Remover da árvore"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="border-t border-zinc-800 pt-4 space-y-3">
        <div>
          <label htmlFor="arv-nome" className="block text-xs text-zinc-500 mb-1">
            Nome completo
          </label>
          <input
            id="arv-nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
            placeholder="Nome de quem entra na árvore"
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600"
          />
        </div>

        <div>
          <label htmlFor="arv-tipo" className="block text-xs text-zinc-500 mb-1">
            Parentesco
          </label>
          <select
            id="arv-tipo"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            required
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm"
          >
            <option value="">Selecione…</option>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="arv-nasc" className="block text-xs text-zinc-500 mb-1">
              Ano de nascimento
            </label>
            <input
              id="arv-nasc"
              inputMode="numeric"
              value={form.ano_nascimento}
              onChange={(e) => setForm({ ...form, ano_nascimento: e.target.value })}
              placeholder="1922"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="arv-falec" className="block text-xs text-zinc-500 mb-1">
              Ano de falecimento
            </label>
            <input
              id="arv-falec"
              inputMode="numeric"
              value={form.ano_falecimento}
              onChange={(e) => setForm({ ...form, ano_falecimento: e.target.value })}
              placeholder="deixe vazio se for vivo"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600"
            />
          </div>
        </div>

        {/* Campo só aparece pra quem ele muda alguma coisa no desenho. */}
        {PEDE_ORDEM.includes(form.tipo) && (
          <div>
            <label htmlFor="arv-ordem" className="block text-xs text-zinc-500 mb-1">
              Ordem de nascimento (1 = mais velho)
            </label>
            <input
              id="arv-ordem"
              inputMode="numeric"
              value={form.ordem_nascimento}
              onChange={(e) => setForm({ ...form, ordem_nascimento: e.target.value })}
              placeholder="1"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600"
            />
            <p className="text-[11px] text-zinc-600 mt-1">
              Na árvore, o mais velho fica à esquerda.
            </p>
          </div>
        )}

        {PEDE_UNIAO.includes(form.tipo) && (
          <div>
            <label htmlFor="arv-uniao" className="block text-xs text-zinc-500 mb-1">
              Situação da união
            </label>
            <select
              id="arv-uniao"
              value={form.uniao}
              onChange={(e) => setForm({ ...form, uniao: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-sm"
            >
              <option value="casamento">Casados (linha cheia)</option>
              <option value="separacao">Separados (linha pontilhada)</option>
            </select>
          </div>
        )}

        {erro && <p className="text-red-400 text-sm">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg"
        >
          {salvando ? 'Salvando...' : 'Adicionar à árvore'}
        </button>
      </form>
    </div>
  )
}
