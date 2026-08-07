'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/auth'

interface GrupoParceiro {
  parceiro_id: string | null
  parceiro_nome: string | null
  total_memoriais: number
  total_tumulos: number
  total_fora_de_fileira: number
}

interface MemorialDoGrupo {
  homenagem_id: string
  nome_completo: string
  lapide_id: string
  codigo: string | null
  fila_id: string | null
  foto_url: string | null
}

/** "Quem opera aqui" -- lista os parceiros com memorial nesse cemitério,
 *  pra Central saber de quem é cada memorial num cemitério que pode ser
 *  compartilhado por várias funerárias. Fica abaixo do mapa (nunca dentro
 *  do MapaCemiterio.tsx, componente já enorme). Planejado com o Opus,
 *  2026-08-07. */
export default function PainelParceirosCemiterio({ cemiterioId }: { cemiterioId: string }) {
  const [grupos, setGrupos] = useState<GrupoParceiro[] | null>(null)
  const [expandido, setExpandido] = useState<string>('')
  const [memoriaisPorGrupo, setMemoriaisPorGrupo] = useState<Record<string, MemorialDoGrupo[]>>({})
  const [carregandoGrupo, setCarregandoGrupo] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('obter_parceiros_do_cemiterio', { p_cemiterio_id: cemiterioId }).then(({ data }) => {
      setGrupos((data as GrupoParceiro[]) || [])
    })
  }, [cemiterioId])

  async function alternar(chave: string, parceiroId: string | null) {
    const abrindo = expandido !== chave
    setExpandido(abrindo ? chave : '')
    if (abrindo && !memoriaisPorGrupo[chave]) {
      setCarregandoGrupo(chave)
      const { data } = await supabase.rpc('obter_memoriais_parceiro_cemiterio', {
        p_cemiterio_id: cemiterioId,
        p_parceiro_id: parceiroId,
      })
      setMemoriaisPorGrupo((s) => ({ ...s, [chave]: (data as MemorialDoGrupo[]) || [] }))
      setCarregandoGrupo(null)
    }
  }

  if (grupos == null) return null
  if (grupos.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mt-4">
        <h2 className="text-sm font-semibold text-white mb-1">Quem opera neste cemitério</h2>
        <p className="text-xs text-zinc-500">Nenhum memorial cadastrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mt-4">
      <h2 className="text-sm font-semibold text-white mb-1">Quem opera neste cemitério</h2>
      <p className="text-xs text-zinc-500 mb-3">Memoriais agrupados por parceiro dono -- útil quando mais de uma funerária atende o mesmo cemitério.</p>
      <div className="space-y-1.5">
        {grupos.map((g) => {
          const chave = g.parceiro_id || '__sem_parceiro__'
          const aberto = expandido === chave
          return (
            <div key={chave} className="rounded border border-zinc-800">
              <button
                type="button"
                onClick={() => alternar(chave, g.parceiro_id)}
                className="w-full flex items-center gap-1.5 text-left text-sm px-3 py-2 text-zinc-200 hover:bg-zinc-800"
              >
                {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {g.parceiro_nome || 'Central / sem parceiro'}
                <span className="text-zinc-500 text-xs ml-auto">
                  {g.total_memoriais} memorial(is) · {g.total_tumulos} túmulo(s)
                  {g.total_fora_de_fileira > 0 && <span style={{ color: '#f87171' }}> · {g.total_fora_de_fileira} fora de fileira</span>}
                </span>
              </button>
              {aberto && (
                <div className="px-3 pb-2 pt-1 border-t border-zinc-800">
                  {carregandoGrupo === chave ? (
                    <p className="text-xs text-zinc-500">Carregando...</p>
                  ) : (
                    <ul className="space-y-1">
                      {(memoriaisPorGrupo[chave] || []).map((m) => (
                        <li key={m.homenagem_id} className="text-xs flex items-center justify-between text-zinc-300">
                          <span>{m.nome_completo}</span>
                          <span style={{ color: m.fila_id ? '#71717a' : '#f59e0b' }}>
                            {m.codigo || (m.fila_id ? '—' : '⚠ fora de fileira')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Link href={`/admin/cemiterios/${cemiterioId}/lapides`} className="text-xs text-zinc-500 hover:text-zinc-300 inline-block mt-3">
        Ver todos os túmulos e vínculos →
      </Link>
    </div>
  )
}
