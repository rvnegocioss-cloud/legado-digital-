// Paleta pra identificar cada fila (fileira) visualmente -- bandeira no mapa,
// bolinha no painel, chip na lista de lápides -- sempre a mesma cor pro
// mesmo número de fileira, em qualquer tela. Cicla se tiver mais filas que
// cores. Extraído de components/admin/MapaCemiterio.tsx pra não duplicar
// entre o mapa e a página de lápides.
export const PALETA_FILAS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee',
  '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#a3e635', '#2dd4bf',
]

export function corDaFila(numero: number) {
  return PALETA_FILAS[(numero - 1) % PALETA_FILAS.length]
}

// Cor de cada rua: mesma paleta das fileiras, escolhida pela posição da rua
// na lista ordenada por número (ordem de criação). Estável enquanto não
// apagar rua; usado no mapa e no painel de ruas.
export function coresDasRuas(ruas: { id: string; numero: number }[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  ruas
    .slice()
    .sort((a, b) => a.numero - b.numero)
    .forEach((r, i) => {
      mapa[r.id] = corDaFila(i + 1)
    })
  return mapa
}
