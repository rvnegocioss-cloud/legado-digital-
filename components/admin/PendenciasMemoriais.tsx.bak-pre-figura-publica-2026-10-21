'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

interface MemorialIncompleto {
  id: string
  nome_completo: string
  preenchido_por: 'funeraria' | 'familia' | null
  origem_cadastro: string | null
  falta: string[]
}

// Memoriais com dado faltando. Morava no topo do Dashboard; foi pra Central
// de Comunicações (2026-09-17, pedido do Rafael) -- é cobrança a fazer com a
// família/parceiro, não número de acompanhamento.
export default function PendenciasMemoriais() {
  const [incompletos, setIncompletos] = useState<MemorialIncompleto[]>([])

  useEffect(() => {
    supabase
      .from('homenagens')
      .select('id, nome_completo, data_falecimento, foto_url, biografia, familia_email, preenchido_por, origem_cadastro, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        const lista = (data || [])
          .map((m) => {
            const falta: string[] = []
            if (!m.data_falecimento) falta.push('data de falecimento')
            if (!m.foto_url) falta.push('foto')
            if (!m.biografia) falta.push('história')
            if (!m.familia_email) falta.push('contato da família')
            return { ...m, falta }
          })
          .filter((m) => m.falta.length > 0)
        setIncompletos(lista as MemorialIncompleto[])
      })
  }, [])

  if (incompletos.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 mb-8">
      <h2 className="text-sm font-semibold mb-1" style={{ color: '#fbbf24' }}>
        {incompletos.length} memorial{incompletos.length === 1 ? '' : 'is'} com dados faltando
      </h2>
      <p className="text-xs text-[var(--tema-zinc-400)] mb-3">
        Memorial cadastrado em campo (botão direito no túmulo, pelo mapa do cemitério) nasce só com o nome. Aqui é o que falta em cada um.
      </p>
      <ul className="space-y-1.5">
        {incompletos.slice(0, 12).map((m) => (
          <li key={m.id} className="flex items-start justify-between gap-3 text-xs flex-wrap">
            <Link href={`/admin/memoriais/${m.id}`} className="font-medium hover:underline" style={{ color: '#C9A46A' }}>
              {m.nome_completo}
            </Link>
            <span className="text-[var(--tema-zinc-400)] flex-1 min-w-[180px]">
              falta {m.falta.join(', ')}
              {m.preenchido_por === 'familia' && <span className="text-blue-400"> · aguardando a família</span>}
              {m.origem_cadastro === 'mapa_cemiterio' && <span> · cadastrado no cemitério</span>}
            </span>
          </li>
        ))}
      </ul>
      {incompletos.length > 12 && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">e mais {incompletos.length - 12}...</p>}
    </div>
  )
}
