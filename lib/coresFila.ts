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
