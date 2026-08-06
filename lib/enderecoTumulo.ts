import { comprimentoPolilinha, distanciaMetros } from './geo'

export interface RotulosCemiterio {
  rotulo_quadra: string
  rotulo_fila: string
  rotulo_tumulo: string
}

const ROTULOS_PADRAO: RotulosCemiterio = {
  rotulo_quadra: 'Quadra',
  rotulo_fila: 'Rua',
  rotulo_tumulo: 'Túmulo',
}

export function montarCodigo(quadra: number, fila: number, numero: number) {
  const q = String(quadra).padStart(2, '0')
  const f = String(fila).padStart(2, '0')
  const n = String(numero).padStart(3, '0')
  return `Q${q}-R${f}-T${n}`
}

export function formatarEndereco(
  partes: { quadra?: number | null; fila?: number | null; numero?: number | null },
  rotulos: Partial<RotulosCemiterio> = {}
) {
  const r = { ...ROTULOS_PADRAO, ...rotulos }
  const segmentos: string[] = []
  if (partes.quadra != null) segmentos.push(`${r.rotulo_quadra} ${partes.quadra}`)
  if (partes.fila != null) segmentos.push(`${r.rotulo_fila} ${partes.fila}`)
  if (partes.numero != null) segmentos.push(`${r.rotulo_tumulo} ${partes.numero}`)
  return segmentos.join(' · ')
}

export function formatarEnderecoCurto(partes: { quadra?: number | null; fila?: number | null; numero?: number | null }) {
  const segmentos: string[] = []
  if (partes.quadra != null) segmentos.push(`Q${partes.quadra}`)
  if (partes.fila != null) segmentos.push(`R${partes.fila}`)
  if (partes.numero != null) segmentos.push(`T${partes.numero}`)
  return segmentos.join(' · ')
}

/** Mesmo algoritmo de interpolação do RPC gerar_lapides_fila (ponto_na_polilinha) --
 *  usado só pra preview no cliente antes de confirmar, a escrita real acontece no banco. */
export function interpolarPontos(coordenadas: [number, number][], quantidade: number): [number, number][] {
  if (quantidade === 1) return [coordenadas[0]]
  const total = comprimentoPolilinha(coordenadas)
  const pontos: [number, number][] = []

  for (let i = 0; i < quantidade; i++) {
    const fracao = i / (quantidade - 1)
    pontos.push(pontoNaFracao(coordenadas, fracao, total))
  }
  return pontos
}

function pontoNaFracao(coordenadas: [number, number][], fracao: number, total: number): [number, number] {
  if (coordenadas.length === 1) return coordenadas[0]
  const alvo = Math.max(0, Math.min(1, fracao)) * total
  let acumulado = 0

  for (let i = 0; i < coordenadas.length - 1; i++) {
    const [lng1, lat1] = coordenadas[i]
    const [lng2, lat2] = coordenadas[i + 1]
    const seg = segmentoMetros(lat1, lng1, lat2, lng2)

    if (acumulado + seg >= alvo || i === coordenadas.length - 2) {
      const t = seg === 0 ? 0 : Math.max(0, Math.min(1, (alvo - acumulado) / seg))
      return [lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t]
    }
    acumulado += seg
  }
  return coordenadas[coordenadas.length - 1]
}

function segmentoMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Espaçamento padrão entre túmulos quando ainda não há histórico real pra
 *  medir (chute do 1º lote de uma fileira nova) -- baseado na faixa real já
 *  medida no José Lázaro (~1,5-1,66m ao longo da fileira), não no comprimento
 *  do eixo. Gera os pontos GRUDADOS logo após o início/último confirmado; o
 *  staff arrasta pra abrir/ajustar, nunca precisa "puxar de volta" um chute
 *  que espalhou os túmulos até o fim da fileira. */
const PITCH_PADRAO_M = 1.6

/** Mede o espaçamento real (baseado nos já confirmados, ou o chute padrão) e
 *  quanto falta de fileira -- independe de quantidade, então dá pra mostrar
 *  "restam ~N túmulos" e o botão "preencher até o fim" mesmo antes do staff
 *  digitar um tamanho de lote. */
export function medirContinuacao(eixo: [number, number][], existentes: { lat: number; lng: number }[]) {
  const inicio = eixo[0]
  const fim = eixo[eixo.length - 1]
  const dirDist = comprimentoPolilinha([inicio, fim]) || 1
  const dirLng = (fim[0] - inicio[0]) / dirDist
  const dirLat = (fim[1] - inicio[1]) / dirDist

  const ultimo = existentes.length > 0 ? existentes[existentes.length - 1] : { lat: inicio[1], lng: inicio[0] }
  const restanteM = distanciaMetros(ultimo.lat, ultimo.lng, fim[1], fim[0])

  let pitch: number
  if (existentes.length >= 2) {
    let soma = 0
    for (let i = 1; i < existentes.length; i++) {
      soma += distanciaMetros(existentes[i - 1].lat, existentes[i - 1].lng, existentes[i].lat, existentes[i].lng)
    }
    pitch = soma / (existentes.length - 1)
  } else {
    pitch = PITCH_PADRAO_M
  }

  return { ultimo, dirLng, dirLat, pitch, restanteM, medidoDeVerdade: existentes.length >= 2 }
}

/** Gera um LOTE de pontos continuando a partir do último túmulo já confirmado
 *  na fileira (ou do início do eixo, se nenhum ainda) -- em vez de reinterpolar
 *  a fileira inteira do zero a cada geração. O espaçamento usado é a MÉDIA
 *  real medida entre os túmulos já confirmados (quando tem 2+); sem histórico
 *  ainda, usa PITCH_PADRAO_M (chute fixo, não escala com o tamanho do lote
 *  nem com o que resta de fileira) -- o staff corrige arrastando cada ponto
 *  do lote antes de gerar. */
export function gerarPontosContinuacao(
  eixo: [number, number][],
  existentes: { lat: number; lng: number }[],
  quantidade: number
): { pontos: [number, number][]; pitch: number; restanteM: number; medidoDeVerdade: boolean } {
  const { ultimo, dirLng, dirLat, pitch, restanteM, medidoDeVerdade } = medirContinuacao(eixo, existentes)

  const kInicial = existentes.length > 0 ? 1 : 0
  const pontos: [number, number][] = []
  for (let i = 0; i < quantidade; i++) {
    const k = kInicial + i
    const distancia = k * pitch
    pontos.push([ultimo.lng + dirLng * distancia, ultimo.lat + dirLat * distancia])
  }

  return { pontos, pitch, restanteM, medidoDeVerdade }
}

export function validarEspacamento(comprimentoM: number, quantidade: number) {
  if (quantidade <= 1) return { ok: true, espacamento: 0, aviso: '' }
  const espacamento = comprimentoM / (quantidade - 1)
  if (espacamento < 0.8) {
    return { ok: false, espacamento, aviso: `${espacamento.toFixed(2)} m entre túmulos — parece pouco, confere a quantidade.` }
  }
  if (espacamento > 3.0) {
    return { ok: false, espacamento, aviso: `${espacamento.toFixed(2)} m entre túmulos — parece muito, confere a quantidade.` }
  }
  return { ok: true, espacamento, aviso: '' }
}
