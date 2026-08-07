'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getAdminUser, getParceiroUser, supabase } from '@/lib/auth'

const MapaCemiterio = dynamic(
  () => import('@/components/admin/MapaCemiterio').then((m) => m.MapaCemiterio),
  { ssr: false, loading: () => <p className="text-zinc-400 text-sm">Carregando mapa...</p> }
)

interface MeuMemorial {
  id: string
  nome_completo: string
  slug: string | null
  lapide_id: string | null
  lapides: { codigo: string | null; fila_id: string | null } | null
}

export default function CemiterioParceiroDetalhe() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <CemiterioParceiroDetalheInner />
    </Suspense>
  )
}

function CemiterioParceiroDetalheInner() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [meusMemoriais, setMeusMemoriais] = useState<MeuMemorial[]>([])

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    setLoading(true)
    const { data: cemiterio } = await supabase.from('cemiterios').select('nome').eq('id', id).single()
    setNome(cemiterio?.nome || '')

    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    if (meuParceiroId) {
      const { data } = await supabase
        .from('homenagens')
        .select('id, nome_completo, slug, lapide_id, lapides!inner(codigo, fila_id, cemiterio_id)')
        .eq('parceiro_id', meuParceiroId)
        .eq('lapides.cemiterio_id', id)
        .order('nome_completo')
      setMeusMemoriais((data as any) || [])
    }
    setLoading(false)
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <Link
        href={`/parceiro/cemiterios${parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''}`}
        className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
      >
        ← Voltar pra Cemitérios
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">{nome}</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Mapa e organização de quadra/fileira/túmulo, mantidos pela Central Legado Digital -- aqui é só visualização.
      </p>

      <MapaCemiterio cemiterioId={id} modo="leitura" />

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mt-4">
        <h2 className="text-sm font-semibold text-white mb-1">Meus memoriais neste cemitério</h2>
        {meusMemoriais.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhum memorial seu vinculado a esse cemitério ainda.</p>
        ) : (
          <ul className="space-y-1">
            {meusMemoriais.map((m) => (
              <li key={m.id} className="text-xs flex items-center justify-between text-zinc-300">
                <Link href={`/parceiro/memoriais/${m.id}${parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''}`} className="hover:text-white">
                  {m.nome_completo}
                </Link>
                <span style={{ color: m.lapides?.fila_id ? '#71717a' : '#f59e0b' }}>
                  {m.lapides?.codigo || (m.lapide_id ? '—' : 'sem túmulo vinculado')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
