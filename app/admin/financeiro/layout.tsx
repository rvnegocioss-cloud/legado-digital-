'use client'

import { useEffect, useState } from 'react'

import { Casca } from '@/components/financeiro/Casca'
import type { DadosFinanceiros } from '@/lib/financeiro/consultas'
import { EstadoProvider } from '@/lib/financeiro/estado'
import { supabase } from '@/lib/auth'
import './financeiro.css'

// Área só-staff (a Central já barra quem não é staff; a API confere de novo no servidor).
export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<DadosFinanceiros | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Sem sessão: entre na Central para ver os números reais.')
        const r = await fetch('/api/admin/financeiro', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (r.status === 403 || r.status === 401) throw new Error('Esta área é só da equipe do Legado Digital.')
        if (!r.ok) throw new Error('Não foi possível consultar o Supabase agora.')
        const j = (await r.json()) as DadosFinanceiros
        if (vivo) {
          setDados(j)
          setEstado('ok')
        }
      } catch (e) {
        if (vivo) {
          setErro(e instanceof Error ? e.message : 'Falha na consulta.')
          setEstado('erro')
        }
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  return (
    <EstadoProvider dadosApi={dados} estadoDados={estado} mensagemErro={erro}>
      <Casca>{children}</Casca>
    </EstadoProvider>
  )
}
