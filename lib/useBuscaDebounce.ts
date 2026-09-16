'use client'

import { useEffect, useState } from 'react'

// Todo campo de busca e de preenchimento do sistema completa enquanto a pessoa
// digita (regra do Rafael, 2026-09-15) -- este hook é a regra em um lugar só,
// pra não existirem N cópias com temporizações diferentes.
//
// Duas coisas que todo autocomplete precisa e que é fácil esquecer:
//  - esperar a pessoa parar de digitar, senão sai uma consulta por tecla;
//  - descartar resposta de busca antiga. Quem digita rápido dispara várias e
//    elas não voltam em ordem -- sem isso, a lista pisca com o resultado errado.
export function useBuscaDebounce<T>(
  termo: string,
  buscar: (termo: string) => Promise<T[]>,
  opcoes?: { minimo?: number; espera?: number; ativo?: boolean }
) {
  const minimo = opcoes?.minimo ?? 2
  const espera = opcoes?.espera ?? 300
  const ativo = opcoes?.ativo ?? true

  const [resultados, setResultados] = useState<T[] | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const limpo = termo.trim()
    if (!ativo || limpo.length < minimo) {
      setResultados(null)
      setBuscando(false)
      return
    }

    let cancelado = false
    setBuscando(true)

    const timer = setTimeout(async () => {
      try {
        const dados = await buscar(limpo)
        if (!cancelado) setResultados(dados)
      } catch {
        if (!cancelado) setResultados([])
      }
      if (!cancelado) setBuscando(false)
    }, espera)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
    // `buscar` fica de fora de propósito: quase sempre é uma função nova a cada
    // render, e incluí-la reiniciaria o temporizador sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, minimo, espera, ativo])

  return { resultados, buscando, limpar: () => setResultados(null) }
}
