// Paleta pra identificar cada fila visualmente (bandeira no mapa + bolinha
// na lista). Mesma lista no mapa e no painel.
export const PALETA_FILAS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee',
  '#60a5fa', '#a78bfa', '#f472b6', '#fb7185', '#a3e635', '#2dd4bf',
]

export function corDaFila(numero: number) {
  return PALETA_FILAS[(numero - 1) % PALETA_FILAS.length]
}

// Cores que o usuario pode escolher pra uma rua (legiveis sobre foto aerea).
export const CORES_RUA = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6']
