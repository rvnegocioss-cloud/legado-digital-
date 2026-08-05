'use client'

import { useCallback, useState } from 'react'

export type TipoDesenho = 'ponto' | 'linha' | 'poligono'

interface EstadoDesenho {
  tipo: TipoDesenho
  pontos: [number, number][]
  onConcluir: (pontos: [number, number][]) => void
}

/** Primitiva única de desenho no mapa -- ponto (clique único), linha (N cliques
 *  + concluir) e polígono (N cliques + concluir fecha o anel). Serve entrada,
 *  quadra, fila e o "mover pino" de lápide, sem depender de lib externa. */
export function useDesenhoNoMapa() {
  const [ativo, setAtivo] = useState<EstadoDesenho | null>(null)

  const iniciar = useCallback((tipo: TipoDesenho, onConcluir: (pontos: [number, number][]) => void) => {
    setAtivo({ tipo, pontos: [], onConcluir })
  }, [])

  const cancelar = useCallback(() => setAtivo(null), [])

  const adicionarPonto = useCallback((lng: number, lat: number) => {
    setAtivo((atual) => {
      if (!atual) return atual
      if (atual.tipo === 'ponto') {
        atual.onConcluir([[lng, lat]])
        return null
      }
      return { ...atual, pontos: [...atual.pontos, [lng, lat]] }
    })
  }, [])

  const concluir = useCallback(() => {
    setAtivo((atual) => {
      if (!atual || atual.pontos.length === 0) return atual
      if (atual.tipo === 'poligono' && atual.pontos.length < 3) return atual
      if (atual.tipo === 'linha' && atual.pontos.length < 2) return atual
      const pontos =
        atual.tipo === 'poligono' ? [...atual.pontos, atual.pontos[0]] : atual.pontos
      atual.onConcluir(pontos)
      return null
    })
  }, [])

  const desfazerUltimoPonto = useCallback(() => {
    setAtivo((atual) => (atual ? { ...atual, pontos: atual.pontos.slice(0, -1) } : atual))
  }, [])

  const geojsonPreview = ativo && ativo.pontos.length > 0 ? construirPreview(ativo.tipo, ativo.pontos) : null

  return {
    modo: ativo?.tipo ?? null,
    pontos: ativo?.pontos ?? [],
    ativo: ativo != null,
    iniciar,
    adicionarPonto,
    concluir,
    cancelar,
    desfazerUltimoPonto,
    geojsonPreview,
  }
}

function construirPreview(tipo: TipoDesenho, pontos: [number, number][]) {
  if (tipo === 'ponto' || pontos.length < 2) {
    return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: pontos[0] }, properties: {} }
  }
  if (tipo === 'linha' || pontos.length < 3) {
    return { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: pontos }, properties: {} }
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [[...pontos, pontos[0]]] },
    properties: {},
  }
}
