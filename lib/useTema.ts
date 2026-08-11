'use client'

import { useEffect, useState } from 'react'

export type Tema = 'escuro' | 'claro'

const CHAVE_ATUAL = 'legado-tema'
const CHAVE_ANTIGA = 'legado-central-tema' // só pra não perder o ajuste de quem já tinha trocado antes de virar preferência compartilhada

/** Tema claro/escuro compartilhado entre Central e Portal do Parceiro (mesma
 * pessoa cruza os dois via "Acessar Plataforma do Parceiro" -- chave única
 * evita o tema piscar ao trocar de portal). Aplica em document.documentElement
 * (não numa div interna) pra cobrir modais/dialogs, que renderizam via portal
 * direto em document.body, fora da árvore do layout. */
export function useTema() {
  const [tema, setTema] = useState<Tema>('escuro')

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_ATUAL) ?? localStorage.getItem(CHAVE_ANTIGA)
    if (salvo === 'claro' || salvo === 'escuro') setTema(salvo)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    return () => {
      delete document.documentElement.dataset.tema
    }
  }, [tema])

  function alternarTema() {
    setTema((atual) => {
      const proximo: Tema = atual === 'escuro' ? 'claro' : 'escuro'
      localStorage.setItem(CHAVE_ATUAL, proximo)
      return proximo
    })
  }

  return { tema, alternarTema }
}
