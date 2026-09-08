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
}

interface Jazigo {
  lapide_id: string
  codigo: string | null
  identificacao: string | null
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

export default function JazigoDaFamilia({ slug, memorialId }: { slug: string; memorialId: string }) {
  const [jazigo, setJazigo] = useState<Jazigo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch(`/api/familia-jazigo?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => setJazigo(j.jazigo || null))
      .catch(() => setJazigo(null))
      .finally(() => setCarregando(false))
  }, [slug])

  if (carregando) return null
  // Memorial ainda sem túmulo vinculado: o card simplesmente não existe.
  if (!jazigo) return null

  const ehGestor = jazigo.gestor_homenagem_id === memorialId
  const ocupadas = jazigo.gavetas.filter((g) => g.homenagem_id).length

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="text-base font-semibold text-white">Jazigo da família</h2>
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

      <p className="text-[11px] text-zinc-500">
        Para incluir alguém neste jazigo, fale com a funerária responsável — o cadastro das gavetas é
        feito por ela.
      </p>
    </div>
  )
}
