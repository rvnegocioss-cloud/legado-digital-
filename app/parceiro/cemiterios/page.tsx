'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getAdminUser, getParceiroUser, supabase } from '@/lib/auth'

interface Cemiterio {
  id: string
  nome: string
  cidade: string | null
  estado: string | null
  ortomosaico_url: string | null
}

export default function CemiteriosParceiro() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <CemiteriosParceiroInner />
    </Suspense>
  )
}

function CemiteriosParceiroInner() {
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const [loading, setLoading] = useState(true)
  const [cemiterios, setCemiterios] = useState<Cemiterio[]>([])
  const [memoriaisPorCemiterio, setMemoriaisPorCemiterio] = useState<Record<string, number>>({})

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)

    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    // RLS já filtra pra só os cemitérios que esse parceiro está autorizado a
    // ver (cemiterios_parceiro_select / _junction) -- sem filtro manual aqui.
    const { data: cemiteriosData } = await supabase
      .from('cemiterios')
      .select('id, nome, cidade, estado, ortomosaico_url')
      .order('nome')
    setCemiterios(cemiteriosData || [])

    if (meuParceiroId) {
      const { data: memoriais } = await supabase
        .from('homenagens')
        .select('id, lapides(cemiterio_id)')
        .eq('parceiro_id', meuParceiroId)
      const contagem: Record<string, number> = {}
      ;(memoriais || []).forEach((m: any) => {
        const cid = m.lapides?.cemiterio_id
        if (cid) contagem[cid] = (contagem[cid] || 0) + 1
      })
      setMemoriaisPorCemiterio(contagem)
    }

    setLoading(false)
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Cemitérios</h1>
      <p className="text-[var(--tema-zinc-400)] text-sm mb-6">
        Mapa e organização de quadra/fileira/túmulo dos cemitérios onde você atua -- geometria mapeada e mantida pela Central Legado
        Digital, aqui você só visualiza.
      </p>

      {cemiterios.length === 0 ? (
        <p className="text-[var(--tema-zinc-500)] text-sm">
          Nenhum cemitério vinculado ainda. Fale com a equipe Legado Digital pra sua funerária ser autorizada a ver um cemitério aqui.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cemiterios.map((c) => (
            <Link
              key={c.id}
              href={`/parceiro/cemiterios/${c.id}${parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''}`}
              className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-4 hover:border-[var(--tema-zinc-600)] transition-colors"
            >
              <h2 className="text-sm font-semibold text-white mb-1">{c.nome}</h2>
              <p className="text-xs text-[var(--tema-zinc-500)] mb-3">
                {c.cidade}
                {c.estado && `, ${c.estado}`}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--tema-zinc-400)]">{c.ortomosaico_url ? 'Ortomosaico de drone' : 'Satélite genérico'}</span>
                <span style={{ color: '#C9A46A' }}>{memoriaisPorCemiterio[c.id] || 0} meu(s) memorial(is)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
