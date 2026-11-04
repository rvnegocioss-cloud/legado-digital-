'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { VisaoParceiro, type MemorialDoParceiro } from '@/components/financeiro/VisaoParceiro'
import { supabase } from '@/lib/auth'

function Conteudo() {
  const sp = useSearchParams()
  const parceiroId = sp.get('parceiro_id')
  const suffix = parceiroId ? `?parceiro_id=${parceiroId}` : ''
  const [nome, setNome] = useState('Parceiro')
  const [memoriais, setMemoriais] = useState<MemorialDoParceiro[]>([])
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Sem sessão: entre no portal para ver os seus números.')
        const url = '/api/parceiro/financeiro' + (parceiroId ? `?parceiro_id=${encodeURIComponent(parceiroId)}` : '')
        const r = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (r.status === 403) throw new Error('Você não tem acesso a este parceiro.')
        if (!r.ok) throw new Error('Não foi possível consultar agora.')
        const j = await r.json()
        if (!vivo) return
        setNome(j.nome)
        setMemoriais(j.memoriais)
        setEstado('ok')
      } catch (e) {
        if (!vivo) return
        setErro(e instanceof Error ? e.message : 'Falha na consulta.')
        setEstado('erro')
      }
    })()
    return () => {
      vivo = false
    }
  }, [parceiroId])

  return <VisaoParceiro nome={nome} memoriais={memoriais} estado={estado} mensagemErro={erro} editarHref={`/parceiro/minha-pagina${suffix}`} />
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  )
}
