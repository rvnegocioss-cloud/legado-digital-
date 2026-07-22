'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/auth'

const JazigoGavetas3D = dynamic(() => import('@/components/admin/JazigoGavetas3D'), { ssr: false })

interface GavetaInfo {
  id: string
  codigo: string
  linha: number
  coluna: number
  observacoes: string | null
  homenagem: { nome_completo: string; slug: string } | null
}

export default function GavetasLapide3D() {
  const { id, lapideId } = useParams<{ id: string; lapideId: string }>()
  const [lapideNome, setLapideNome] = useState('')
  const [gavetas, setGavetas] = useState<GavetaInfo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: lapide } = await supabase.from('lapides').select('identificacao').eq('id', lapideId).single()
    setLapideNome(lapide?.identificacao || '')

    const { data } = await supabase
      .from('gavetas')
      .select('id, codigo, linha, coluna, observacoes, homenagens(nome_completo, slug)')
      .eq('lapide_id', lapideId)

    const normalizado = (data || []).map((g: any) => ({
      id: g.id,
      codigo: g.codigo,
      linha: g.linha,
      coluna: g.coluna,
      observacoes: g.observacoes,
      homenagem: g.homenagens || null,
    }))
    setGavetas(normalizado)
    setLoading(false)
  }, [lapideId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <Link href={`/admin/cemiterios/${id}/lapides`} className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Lápides
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Jazigo Gavetas 3D — {lapideNome}</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Visualização real das gavetas cadastradas.{' '}
        <Link href={`/admin/cemiterios/${id}/lapides/${lapideId}/gavetas`} className="hover:underline" style={{ color: '#C9A46A' }}>
          Cadastrar/editar gavetas →
        </Link>
      </p>

      {gavetas.length === 0 ? (
        <p className="text-zinc-400">Nenhuma gaveta cadastrada nesse jazigo ainda.</p>
      ) : (
        <JazigoGavetas3D gavetas={gavetas} />
      )}
    </div>
  )
}
