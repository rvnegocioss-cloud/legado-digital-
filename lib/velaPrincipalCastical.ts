// Geometria pura do castiçal de bronze — migrado do protótipo aprovado pelo
// Rafael (Desktop\Cerebro Claude - Legado Digital\prototipo-parede-velas\,
// briefing MIGRAR-PARA-O-PROJETO.md, decisão confirmada 2026-08-26/27: troca
// o vídeo real da vela principal, código isolado em
// CASTICAL-E-CHAMA-CODIGO-ISOLADO.html).
//
// Separado num arquivo puro pelo mesmo motivo de lib/muralVelas.ts: o desenho
// no canvas e o cálculo de onde a chama que "voa" da vela até a parede deve
// NASCER usam a mesma geometria — se divergirem, a chama nasce fora do pavio.

export const VELA_ESCALA = 0.58 // menor — pedido do Rafael
export const VELA_LARGURA_DESENHO = 190
export const VELA_ALTURA_DESENHO = 200

export const VELA_CX = 95 // eixo central
export const VELA_BASE_Y = 192 // onde o castiçal toca o chão
export const VELA_LARGURA_CORPO = 46 // largura da vela: grossa, não um risco
export const VELA_TOPO = 72 // topo do corpo da vela
export const VELA_PRATO = 155 // onde a vela senta no castiçal

/** Largura/altura CSS renderizada do canvas (== box do host). */
export function tamanhoRenderizado() {
  return {
    largura: VELA_LARGURA_DESENHO * VELA_ESCALA,
    altura: VELA_ALTURA_DESENHO * VELA_ESCALA,
  }
}

/** Ponto do pavio (onde a chama nasce) em coordenadas locais do desenho. */
export function pontoDoPavio() {
  return { x: VELA_CX, y: VELA_TOPO - 5 }
}
