export type Ortomosaico = {
  url: string
  minzoom: number
  maxzoom: number
  bounds: [number, number, number, number] | null
}

// null-safe -- vira null se a url faltar, pra quem consome poder cair no
// fallback (satélite genérico) sem checar campo por campo.
export function normalizarOrtomosaico(raw: {
  url?: string | null
  minzoom?: number | null
  maxzoom?: number | null
  bounds?: number[] | null
}): Ortomosaico | null {
  if (!raw?.url) return null
  return {
    url: raw.url,
    minzoom: raw.minzoom ?? 14,
    maxzoom: raw.maxzoom ?? 22,
    bounds:
      Array.isArray(raw.bounds) && raw.bounds.length === 4
        ? (raw.bounds as [number, number, number, number])
        : null,
  }
}

// Source raster do MapLibre pro ortomosaico -- usado tanto no mapa do
// cemitério (Central) quanto na seção "Como Chegar" de cada memorial,
// zero duplicação entre os dois consumidores.
export function sourceOrtomosaico(o: Ortomosaico) {
  return {
    type: 'raster' as const,
    tiles: [`pmtiles://${o.url}/{z}/{x}/{y}`],
    tileSize: 256,
    minzoom: o.minzoom,
    maxzoom: o.maxzoom,
    ...(o.bounds ? { bounds: o.bounds } : {}),
    attribution: 'Ortomosaico de drone · Legado Digital',
  }
}
