'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ScrollText, ClipboardList, CreditCard } from 'lucide-react'
import { supabase, getParceiroUser } from '@/lib/auth'

interface ParceiroInfo {
  id: string
  nome_fantasia: string | null
  razao_social: string
  plano_contratado: string | null
  status_pagamento: string
}

const PAGAMENTO_LABEL: Record<string, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-green-900/50 text-green-400' },
  pendente: { label: 'Pendente', className: 'bg-yellow-900/50 text-yellow-400' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-900/50 text-red-400' },
}

export default function ParceiroDashboard() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <ParceiroDashboardInner />
    </Suspense>
  )
}

function ParceiroDashboardInner() {
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')

  const [parceiro, setParceiro] = useState<ParceiroInfo | null>(null)
  const [totalMemoriais, setTotalMemoriais] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    let meuParceiroId = parceiroIdParam
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    if (!meuParceiroId) {
      setLoading(false)
      return
    }

    const [{ data: p }, { count }] = await Promise.all([
      supabase
        .from('parceiros_b2b')
        .select('id, nome_fantasia, razao_social, plano_contratado, status_pagamento')
        .eq('id', meuParceiroId)
        .single(),
      supabase
        .from('homenagens')
        .select('*', { count: 'exact', head: true })
        .eq('parceiro_id', meuParceiroId),
    ])

    setParceiro(p)
    setTotalMemoriais(count || 0)
    setLoading(false)
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>
  if (!parceiro) return <p className="text-zinc-400">Parceiro não encontrado.</p>

  const pagamento = PAGAMENTO_LABEL[parceiro.status_pagamento] || PAGAMENTO_LABEL.em_dia
  const memoriaisHref = parceiroIdParam
    ? `/parceiro/memoriais?parceiro_id=${parceiroIdParam}`
    : '/parceiro/memoriais'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">
        Dashboard — {parceiro.nome_fantasia || parceiro.razao_social}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href={memoriaisHref}
          className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <ScrollText className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Memoriais cadastrados</h2>
          <p className="text-3xl font-bold text-white mt-2">{totalMemoriais}</p>
        </Link>

        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <ClipboardList className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Plano contratado</h2>
          <p className="text-xl font-bold text-white mt-2">{parceiro.plano_contratado || '—'}</p>
        </div>

        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <CreditCard className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Status de pagamento</h2>
          <p className="mt-2">
            <span className={`px-2 py-1 rounded text-sm ${pagamento.className}`}>
              {pagamento.label}
            </span>
          </p>
        </div>
      </div>

      <Link
        href={memoriaisHref}
        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
      >
        Ver todos os memoriais →
      </Link>
    </div>
  )
}
