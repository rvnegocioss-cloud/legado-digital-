'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'
import { useBuscaDebounce } from '@/lib/useBuscaDebounce'

export interface JazigoEscolhido {
  id: string
  codigo: string | null
  identificacao: string
  fila_id: string | null
  quadraNumero: number | null
  filaNumero: number | null
  totalMemoriais: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(l: any): JazigoEscolhido {
  return {
    id: l.id,
    codigo: l.codigo,
    identificacao: l.identificacao,
    fila_id: l.fila_id,
    quadraNumero: l.quadras?.numero ?? null,
    filaNumero: l.filas?.numero ?? null,
    totalMemoriais: (l.homenagens || []).length,
  }
}

export function rotuloJazigo(j: JazigoEscolhido) {
  const codigo = j.codigo || j.identificacao
  if (j.quadraNumero == null && j.filaNumero == null) return codigo
  return `${codigo} · Quadra ${j.quadraNumero ?? '?'} · Fileira ${j.filaNumero ?? '?'}`
}

// Escolha de jazigo por busca, no lugar do select que carregava até 5.000
// túmulos de uma vez (Central e Portal do Parceiro usavam o mesmo). Cemitério
// grande cabe: só vem o que a pessoa procurou (regra do Rafael de 2026-09-15 --
// todo campo de busca e preenchimento completa enquanto se digita).
export function SelecaoJazigo({
  cemiterioId,
  valorId,
  onEscolher,
  desabilitado,
}: {
  cemiterioId: string
  valorId: string
  onEscolher: (jazigo: JazigoEscolhido | null) => void
  desabilitado?: boolean
}) {
  const [termo, setTermo] = useState('')
  const [escolhido, setEscolhido] = useState<JazigoEscolhido | null>(null)

  const SELECT =
    'id, codigo, identificacao, fila_id, quadras(numero), filas(numero), homenagens!homenagens_lapide_id_fkey(id)'

  // Ao abrir a ficha de um memorial que já tem jazigo, mostra qual é -- sem
  // isso o campo abriria vazio e pareceria que não há vínculo nenhum.
  useEffect(() => {
    if (!valorId) {
      setEscolhido(null)
      return
    }
    if (escolhido?.id === valorId) return
    let cancelado = false
    supabase
      .from('lapides')
      .select(SELECT)
      .eq('id', valorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado && data) setEscolhido(normalizar(data))
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorId])

  const { resultados, buscando } = useBuscaDebounce<JazigoEscolhido>(
    termo,
    async (busca) => {
      const { data } = await supabase
        .from('lapides')
        .select(SELECT)
        .eq('cemiterio_id', cemiterioId)
        .or(`codigo.ilike.%${busca}%,identificacao.ilike.%${busca}%`)
        .order('codigo')
        .limit(20)
      return ((data || []) as unknown[]).map(normalizar)
    },
    { ativo: !!cemiterioId && !desabilitado }
  )

  if (escolhido) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2">
        <span className="text-sm text-white truncate">{rotuloJazigo(escolhido)}</span>
        <button
          type="button"
          onClick={() => {
            setEscolhido(null)
            setTermo('')
            onEscolher(null)
          }}
          className="text-xs text-[var(--tema-zinc-400)] hover:text-white shrink-0"
        >
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        disabled={!cemiterioId || desabilitado}
        autoComplete="off"
        placeholder={cemiterioId ? 'Comece a digitar o código (ex: Q36-R01)' : 'Escolha o cemitério primeiro'}
        className="flex h-10 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white disabled:opacity-50"
      />
      {(resultados || buscando) && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-900)] shadow-xl">
          {buscando ? (
            <p className="text-xs text-[var(--tema-zinc-500)] px-3 py-2">Buscando...</p>
          ) : resultados!.length === 0 ? (
            <p className="text-xs text-[var(--tema-zinc-500)] px-3 py-2">Nenhum jazigo com esse código.</p>
          ) : (
            resultados!.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => {
                  setEscolhido(j)
                  setTermo('')
                  onEscolher(j)
                }}
                className="w-full text-left px-3 py-2 text-xs text-[var(--tema-zinc-200)] hover:bg-[var(--tema-zinc-800)] border-b border-[var(--tema-zinc-800)] last:border-0"
              >
                <span className="block">{rotuloJazigo(j)}</span>
                {/* O que torna a escolha arriscada aparece já na lista, não só
                    depois de escolher. */}
                {(!j.fila_id || j.totalMemoriais > 0) && (
                  <span className="block text-[10px] text-amber-400">
                    {!j.fila_id && 'fora de fileira'}
                    {!j.fila_id && j.totalMemoriais > 0 && ' · '}
                    {j.totalMemoriais > 0 && `já tem ${j.totalMemoriais} memorial(is)`}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
