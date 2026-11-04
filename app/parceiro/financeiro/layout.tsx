'use client'

import { useEffect, useState } from 'react'

import { EstadoProvider } from '@/lib/financeiro/estado'
import '../../admin/financeiro/financeiro.css'

// Mesma casca visual do Legado Financeiro, só que no Portal do Parceiro: sem abas e sem controles
// da equipe. O tema acompanha o botão de tema do próprio portal (html[data-tema]).
export default function ParceiroFinanceiroLayout({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<'claro' | 'escuro'>('escuro')
  useEffect(() => {
    const ler = () => setTema(document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro')
    ler()
    const obs = new MutationObserver(ler)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])
  return (
    <EstadoProvider>
      <div className="ld-financeiro" data-ftema={tema}>
        <div className="ldf-conteudo">{children}</div>
      </div>
    </EstadoProvider>
  )
}
