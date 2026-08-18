'use client'

import { useEffect, useRef, useState } from 'react'

export interface OutroEditor {
  papel: string
  quem: string | null
  desde: string
}

const INTERVALO_SINAL_MS = 30_000

function chaveDaAba() {
  // Uma chave por aba. sessionStorage (não localStorage) porque duas abas do
  // mesmo navegador SÃO duas edições concorrentes de verdade.
  const existente = sessionStorage.getItem('legado-sessao-edicao')
  if (existente) return existente
  const nova = Math.random().toString(36).slice(2) + Date.now().toString(36)
  sessionStorage.setItem('legado-sessao-edicao', nova)
  return nova
}

export function rotuloPapel(papel: string) {
  if (papel === 'familia') return 'a família'
  if (papel === 'parceiro') return 'a funerária'
  return 'a equipe do Legado Digital'
}

/**
 * Registra presença de quem está editando o memorial e avisa quando tem mais
 * alguém dentro. Serve pros dois lados (família e Central/Parceiro) — a rota
 * decide o papel pela credencial, não pelo que o cliente diz.
 */
export function useTravaEdicao(slug: string | null | undefined, quem?: string, papel?: 'staff' | 'parceiro') {
  const [outros, setOutros] = useState<OutroEditor[]>([])
  const chaveRef = useRef<string>('')

  useEffect(() => {
    if (!slug) return
    chaveRef.current = chaveDaAba()
    let vivo = true

    async function sinalizar() {
      try {
        const res = await fetch('/api/memorial-edicao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, sessaoChave: chaveRef.current, quem, papel }),
        })
        if (!res.ok) return
        const json = await res.json()
        if (vivo) setOutros(json.outros || [])
      } catch {
        // presença é aviso, não trava crítica: falha de rede não pode
        // atrapalhar quem está escrevendo
      }
    }

    sinalizar()
    const timer = setInterval(sinalizar, INTERVALO_SINAL_MS)

    const sair = () => {
      navigator.sendBeacon?.(
        `/api/memorial-edicao?slug=${encodeURIComponent(slug)}&sessaoChave=${chaveRef.current}&_m=delete`
      )
      fetch(`/api/memorial-edicao?slug=${encodeURIComponent(slug)}&sessaoChave=${chaveRef.current}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('beforeunload', sair)

    return () => {
      vivo = false
      clearInterval(timer)
      window.removeEventListener('beforeunload', sair)
      sair()
    }
  }, [slug, quem, papel])

  return { outros, temOutroEditando: outros.length > 0 }
}
