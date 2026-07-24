'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { CORES } from '@/lib/publicTheme'

export function BotaoCompartilhar({ nome }: { nome: string }) {
  const [copiado, setCopiado] = useState(false)

  async function compartilhar() {
    const url = window.location.href
    const dados = { title: `${nome} — Legado Digital`, text: `Em memória de ${nome}`, url }

    if (navigator.share) {
      try {
        await navigator.share(dados)
      } catch {
        // usuário cancelou o compartilhamento nativo — não é erro
      }
      return
    }

    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button
      onClick={compartilhar}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: `1px solid ${CORES.douradoBorda}`,
        color: CORES.dourado,
        padding: '8px 16px',
        fontSize: 12,
        letterSpacing: 0.5,
        borderRadius: 4,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copiado ? <Check size={14} strokeWidth={1.5} /> : <Share2 size={14} strokeWidth={1.5} />}
      {copiado ? 'Link copiado' : 'Compartilhar'}
    </button>
  )
}
