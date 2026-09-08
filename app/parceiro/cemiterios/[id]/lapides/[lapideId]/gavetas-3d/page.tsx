'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/auth'

// O 3D só carrega quando a página abre (nunca no bundle inicial do portal):
// three.js é pesado e a maioria das visitas ao Portal do Parceiro nunca chega
// nesta tela.
const JazigoGavetas3D = dynamic(() => import('@/components/admin/JazigoGavetas3D'), { ssr: false })

interface GavetaInfo {
  id: string
  codigo: string
  linha: number
  coluna: number
  observacoes: string | null
  homenagem: { nome_completo: string; slug: string } | null
}

export default function GavetasParceiro3D() {
  const { id, lapideId } = useParams<{ id: string; lapideId: string }>()
  const [lapideNome, setLapideNome] = useState('')
  const [gavetas, setGavetas] = useState<GavetaInfo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    // RLS decide o que o parceiro enxerga: se o cemitério não é dele, a
    // consulta simplesmente não devolve nada — sem gate duplicado aqui.
    const { data: lapide } = await supabase
      .from('lapides')
      .select('identificacao, codigo')
      .eq('id', lapideId)
      .maybeSingle()
    setLapideNome(lapide?.codigo || lapide?.identificacao || '')

    const { data } = await supabase
      .from('gavetas')
      .select('id, codigo, linha, coluna, observacoes, homenagens(nome_completo, slug)')
      .eq('lapide_id', lapideId)

    setGavetas(
      (data || []).map((g: any) => ({
        id: g.id,
        codigo: g.codigo,
        linha: g.linha,
        coluna: g.coluna,
        observacoes: g.observacoes,
        homenagem: g.homenagens || null,
      }))
    )
    setLoading(false)
  }, [lapideId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <Link
        href={`/parceiro/cemiterios/${id}`}
        className="text-[var(--tema-zinc-400)] hover:text-white text-sm mb-4 inline-block"
      >
        ← Voltar pro cemitério
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Gavetas do jazigo — {lapideNome}</h1>
      <p className="text-[var(--tema-zinc-400)] text-sm mb-6">
        Visualização das gavetas cadastradas neste túmulo.
      </p>

      {gavetas.length === 0 ? (
        <p className="text-[var(--tema-zinc-400)]">Nenhuma gaveta cadastrada nesse jazigo ainda.</p>
      ) : (
        <JazigoGavetas3D gavetas={gavetas} />
      )}
    </div>
  )
}
