// Geometria pura do mural de velas votivas — sem React, sem canvas direto.
// Migrado do protótipo em Desktop\Cerebro Claude - Legado Digital\
// prototipo-parede-velas\ (briefing: MIGRAR-PARA-O-PROJETO.md).
//
// Separado num arquivo puro porque a mesma conta serve pra dois lugares que
// não podem divergir: o desenho de cada vela no canvas (MuralVelasVotivas.tsx)
// e o cálculo de onde a chama que "voa" da vela principal deve pousar
// (AcenderVela.tsx) — se um usar uma fórmula e o outro usar outra, a chama
// voadora não pousa em cima da vela desenhada.

export const MURAL_COLS = 7
export const MURAL_FILAS = 5
export const MURAL_TOTAL = MURAL_COLS * MURAL_FILAS // 35 — era 45 (9 colunas),
// reduzido pra 7: as 2 colunas das pontas caíam em cima das flores do fundo.

export const MURAL_QUADRO_LARGURA = 43
export const MURAL_QUADRO_ALTURA = 132
export const MURAL_QUADROS_NA_SPRITE = 37

export interface LugarVela {
  x: number
  y: number
  escala: number
  fila: number
  t: number
}

/**
 * Ordem de acendimento embaralhada pela parede — mesmo LCG e mesma seed do
 * protótipo, pra reproduzir exatamente o espalhamento visual que o Rafael
 * aprovou (não é aleatório de verdade, é sempre a mesma sequência).
 */
export function gerarOrdemAcendimento(total: number, seed: number): number[] {
  const a = Array.from({ length: total }, (_, i) => i)
  let s = seed
  for (let i = total - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SEED_ORDEM = 20260825
export const ORDEM_ACENDIMENTO = gerarOrdemAcendimento(MURAL_TOTAL, SEED_ORDEM)

/** Posição-na-ordem de cada slot físico (inverso de ORDEM_ACENDIMENTO). */
export const POSTO_DO_SLOT: number[] = (() => {
  const posto = new Array<number>(MURAL_TOTAL)
  ORDEM_ACENDIMENTO.forEach((slotFisico, posicaoNaOrdem) => {
    posto[slotFisico] = posicaoNaOrdem
  })
  return posto
})()

/** Slot físico que corresponde à N-ésima vela acesa (0-indexado). */
export function slotFisicoDaOrdem(posicaoNaOrdem: number): number {
  return ORDEM_ACENDIMENTO[((posicaoNaOrdem % MURAL_TOTAL) + MURAL_TOTAL) % MURAL_TOTAL]
}

/**
 * Posição de um slot dentro do canvas, em pixels locais (0,0 = canto superior
 * esquerdo do canvas). Fileira do fundo menor e mais junta = profundidade de
 * altar, não grade de ícones.
 */
export function lugarDaVela(idx: number, larguraCanvas: number, alturaCanvas: number): LugarVela {
  const fila = Math.floor(idx / MURAL_COLS)
  const coluna = idx % MURAL_COLS
  const t = MURAL_FILAS > 1 ? fila / (MURAL_FILAS - 1) : 1 // 0 = fundo, 1 = frente
  const escala = 0.72 + 0.28 * t
  const y = alturaCanvas * 0.26 + fila * (alturaCanvas * 0.158) + t * alturaCanvas * 0.04
  // Mais estreita que a largura total: não alcança as flores das pontas.
  const larguraFila = larguraCanvas * 0.6 * (0.88 + 0.12 * t)
  const x = (larguraCanvas - larguraFila) / 2 + (coluna + 0.5) * (larguraFila / MURAL_COLS)
  return { x, y, escala, fila, t }
}

/** Altura do banner em função da largura do container — formato paisagem. */
export function alturaDoMural(larguraContainer: number): number {
  return Math.round(larguraContainer * 0.49)
}

/** Topo do copo da vela (onde a chama deve começar) — mesma fórmula do desenho. */
export function topoDoCopoDaVela(lugar: LugarVela): number {
  const alturaCopo = 40 * lugar.escala
  return lugar.y - alturaCopo
}
