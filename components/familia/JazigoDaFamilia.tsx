'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Gaveta {
  id: string
  codigo: string | null
  linha: number | null
  coluna: number | null
  homenagem_id: string | null
  nome: string | null
  slug: string | null
  // Quem está enterrado ali mas ainda não tem memorial digital. A família
  // escreve esse nome aqui e ele aparece no card do jazigo no mapa.
  nome_sem_memorial: string | null
}

interface Jazigo {
  lapide_id: string
  codigo: string | null
  identificacao: string | null
  nome: string | null
  cemiterio_id: string
  cemiterio_nome: string
  cidade: string
  estado: string
  gestor_homenagem_id: string | null
  gavetas: Gaveta[]
  memoriais_sem_gaveta: { id: string; nome: string; slug: string }[]
}

// Traduz Q36-R01-T010 pra linguagem de gente. Código cru não diz nada pra
// família; ela precisa saber quadra, fileira e túmulo.
function lerCodigo(codigo: string | null) {
  if (!codigo) return null
  const m = codigo.match(/^Q(\d+)-R(\d+)-T(\d+)$/i)
  if (!m) return codigo
  return `Quadra ${Number(m[1])} · Fileira ${Number(m[2])} · Túmulo ${Number(m[3])}`
}

export default function JazigoDaFamilia({
  slug,
  memorialId,
  onJazigo,
}: {
  slug: string
  memorialId: string
  // A página inteira mostra o nome do jazigo como identidade da família no
  // topo -- em vez de duplicar a mesma busca, este componente avisa o pai
  // assim que carrega (2026-09-16).
  onJazigo?: (jazigo: { nome: string | null } | null) => void
}) {
  const [jazigo, setJazigo] = useState<Jazigo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [nomeInput, setNomeInput] = useState('')
  const [nomesGaveta, setNomesGaveta] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function carregar() {
    return fetch(`/api/familia-jazigo?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        setJazigo(j.jazigo || null)
        onJazigo?.(j.jazigo ? { nome: j.jazigo.nome } : null)
      })
      .catch(() => setJazigo(null))
  }

  useEffect(() => {
    carregar().finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  function abrirEdicao(j: Jazigo) {
    setNomeInput(j.nome || '')
    setNomesGaveta(
      Object.fromEntries(j.gavetas.filter((g) => !g.homenagem_id).map((g) => [g.id, g.nome_sem_memorial || '']))
    )
    setErro('')
    setEditando(true)
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    try {
      const res = await fetch('/api/familia-jazigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          nome: nomeInput,
          gavetas: Object.entries(nomesGaveta).map(([id, nome]) => ({ id, nome })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Não foi possível salvar')
      await carregar()
      setEditando(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    }
    setSalvando(false)
  }

  if (carregando) return null
  // Memorial ainda sem túmulo vinculado: o card simplesmente não existe.
  if (!jazigo) return null

  const ehGestor = jazigo.gestor_homenagem_id === memorialId
  const ocupadas = jazigo.gavetas.filter((g) => g.homenagem_id || g.nome_sem_memorial).length
  const gavetasLivres = jazigo.gavetas.filter((g) => !g.homenagem_id)

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-semibold text-white">{jazigo.nome || 'Jazigo da família'}</h2>
        {ehGestor && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">
            Este memorial responde pelo jazigo
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        {jazigo.cemiterio_nome} — {jazigo.cidade}/{jazigo.estado}
        {lerCodigo(jazigo.codigo) ? ` · ${lerCodigo(jazigo.codigo)}` : ''}
      </p>

      {/* A família nomeia o jazigo e escreve quem está enterrado nas gavetas que
          ainda não têm memorial. Isso aparece no card do jazigo no mapa
          (2026-09-15, pedido do Rafael). */}
      {editando && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-950/40 p-4 mb-4 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome do jazigo</label>
            <input
              value={nomeInput}
              onChange={(e) => setNomeInput(e.target.value)}
              placeholder="Ex: Jazigo Família Saraiva"
              maxLength={120}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
            />
          </div>

          {gavetasLivres.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Quem está enterrado nas outras gavetas — escreva o nome de quem ainda não tem memorial. Deixe vazio se a
                gaveta está livre.
              </p>
              {gavetasLivres.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 w-16 shrink-0">
                    {g.codigo || `Gaveta ${g.linha ?? ''}`}
                  </span>
                  <input
                    value={nomesGaveta[g.id] ?? ''}
                    onChange={(e) => setNomesGaveta({ ...nomesGaveta, [g.id]: e.target.value })}
                    placeholder="Nome completo"
                    maxLength={120}
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {erro && <p className="text-xs text-red-400">{erro}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="text-sm font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(201,164,106,0.18)', color: '#C9A46A' }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-sm text-zinc-400 hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {jazigo.gavetas.length === 0 ? (
        <p className="text-sm text-zinc-500 mb-4">Nenhuma gaveta cadastrada neste jazigo ainda.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {jazigo.gavetas.map((g) => {
              const seu = g.homenagem_id === memorialId
              return (
                <div
                  key={g.id}
                  className={`rounded-lg border p-3 min-h-[70px] flex flex-col justify-center gap-1 ${
                    seu
                      ? 'border-[#C9A46A] bg-[rgba(201,164,106,0.18)]'
                      : g.homenagem_id
                        ? 'border-[rgba(201,164,106,0.4)] bg-[rgba(201,164,106,0.08)]'
                        : 'border-zinc-700'
                  }`}
                >
                  <span className="text-[10px] tracking-wider text-zinc-500">
                    {g.codigo || `GAVETA ${g.linha ?? ''}${g.coluna ?? ''}`}
                  </span>
                  {g.homenagem_id ? (
                    <span className="text-[13px] text-white">
                      {g.slug ? (
                        <Link href={`/homenagem/${g.slug}`} className="hover:underline">
                          {g.nome}
                        </Link>
                      ) : (
                        g.nome
                      )}
                      {seu && <span className="ml-1.5 text-[11px] text-[#C9A46A]">(este memorial)</span>}
                    </span>
                  ) : g.nome_sem_memorial ? (
                    <span className="text-[13px] text-zinc-300">
                      {g.nome_sem_memorial}
                      <span className="block text-[10px] text-zinc-500">sem memorial</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">Livre</span>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[11px] text-zinc-500 mb-4">
            {ocupadas} de {jazigo.gavetas.length} gaveta{jazigo.gavetas.length === 1 ? '' : 's'} ocupada
            {ocupadas === 1 ? '' : 's'}
          </p>
        </>
      )}

      {jazigo.memoriais_sem_gaveta.length > 0 && (
        <p className="text-xs text-amber-400/90 mb-4">
          {jazigo.memoriais_sem_gaveta.length} memorial
          {jazigo.memoriais_sem_gaveta.length === 1 ? '' : 'is'} deste túmulo ainda sem gaveta definida:{' '}
          {jazigo.memoriais_sem_gaveta.map((m) => m.nome).join(', ')}.
        </p>
      )}

      {!editando && (
        <button
          type="button"
          onClick={() => abrirEdicao(jazigo)}
          className="text-sm font-medium"
          style={{ color: '#C9A46A' }}
        >
          Nomear o jazigo e quem está nele →
        </button>
      )}

      <p className="text-[11px] text-zinc-500 mt-3">
        Você pode dar nome ao jazigo e escrever quem está enterrado nas gavetas que ainda não têm memorial. Criar ou
        remover gaveta é a funerária que faz.
      </p>
    </div>
  )
}
