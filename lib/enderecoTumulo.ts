import { comprimentoPolilinha, deMetrosLocal, distanciaMetros, projetarLocal } from './geo'

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

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const s = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[meio] : (s[meio - 1] + s[meio]) / 2
}

/** Mede o espaçamento real (baseado nos já confirmados, ou o chute padrão) e
 *  quanto falta de fileira -- independe de quantidade, então dá pra mostrar
 *  "restam ~N túmulos" e o botão "preencher até o fim" mesmo antes do staff
 *  digitar um tamanho de lote.
 *
 *  Tudo calculado num plano local em metros (não em graus crus -- 1° de
 *  longitude != 1° de latitude em metros, só dava certo antes porque o
 *  deslocamento era sempre colinear ao eixo).
 *
 *  A "frente" da fileira (de onde o próximo lote continua) é achada por
 *  PROJEÇÃO na direção da fileira, não pelo maior `numero` -- um túmulo
 *  pode ter sido inserido no meio ou arrastado fora de ordem sem que isso
 *  deixe de ser espacialmente o mais avançado. A direção usada é a medida
 *  entre o 1º e o último confirmado (tendência real), caindo pro eixo
 *  desenhado só se tiver pouco confirmado ainda ou a tendência apontar pro
 *  sentido contrário do eixo (proteção contra eixo desenhado ao contrário). */
export function medirContinuacao(
  eixo: [number, number][],
  existentes: { lat: number; lng: number }[],
  opcoes?: { janelaVaos?: number }
) {
  const origem = eixo[0]
  const fimLocal = projetarLocal(origem, eixo[eixo.length - 1])
  const distEixo = Math.hypot(fimLocal.x, fimLocal.y) || 1
  let dir = { x: fimLocal.x / distEixo, y: fimLocal.y / distEixo }

  const locaisTodos = existentes.map((p) => projetarLocal(origem, [p.lng, p.lat]))

  // Janela: mede pitch/direção só nos últimos N confirmados (por projeção no
  // eixo original), não na fileira inteira -- fileira real pode mudar de
  // módulo no meio (jazigo mais largo, corredor), e mediana global "engole"
  // uma mudança recente de espaçamento.
  let locais = locaisTodos
  if (opcoes?.janelaVaos != null && locaisTodos.length > opcoes.janelaVaos + 1) {
    const s0 = locaisTodos.map((p) => p.x * dir.x + p.y * dir.y)
    locais = locaisTodos
      .map((p, i) => ({ p, s: s0[i] }))
      .sort((a, b) => a.s - b.s)
      .slice(-(opcoes.janelaVaos + 1))
      .map((o) => o.p)
  }

  // Direção empírica: extremos ESPACIAIS (por projeção no eixo), não os
  // extremos do ARRAY -- a ordem de chegada (ex: order by numero) não é
  // garantia de ordem espacial real (mesmo motivo que a "frente" abaixo não
  // usa o maior número).
  if (locais.length >= 2) {
    const s0 = locais.map((p) => p.x * dir.x + p.y * dir.y)
    let iMin = 0
    let iMax = 0
    for (let i = 1; i < s0.length; i++) {
      if (s0[i] < s0[iMin]) iMin = i
      if (s0[i] > s0[iMax]) iMax = i
    }
    const a = locais[iMin]
    const b = locais[iMax]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const distEmpirica = Math.hypot(dx, dy)
    if (distEmpirica >= 0.5) {
      const dirEmpirica = { x: dx / distEmpirica, y: dy / distEmpirica }
      if (dirEmpirica.x * dir.x + dirEmpirica.y * dir.y > 0) dir = dirEmpirica
    }
  }

  const projecoes = locais.map((p) => p.x * dir.x + p.y * dir.y)
  let indiceFrente = 0
  for (let i = 1; i < projecoes.length; i++) {
    if (projecoes[i] > projecoes[indiceFrente]) indiceFrente = i
  }

  const ultimoLocal = locais.length > 0 ? locais[indiceFrente] : { x: 0, y: 0 }
  const sUltimo = locais.length > 0 ? projecoes[indiceFrente] : 0
  const sFim = fimLocal.x * dir.x + fimLocal.y * dir.y
  const restanteM = Math.max(0, sFim - sUltimo)
  const passouDoFim = locais.length > 0 && sUltimo > sFim + 0.5

  let pitch = PITCH_PADRAO_M
  let medidoDeVerdade = false
  if (locais.length >= 2) {
    const ordenados = [...locais].sort((p1, p2) => p1.x * dir.x + p1.y * dir.y - (p2.x * dir.x + p2.y * dir.y))
    const vaos: number[] = []
    for (let i = 1; i < ordenados.length; i++) {
      const d = Math.hypot(ordenados[i].x - ordenados[i - 1].x, ordenados[i].y - ordenados[i - 1].y)
      if (d >= 0.3) vaos.push(d)
    }
    if (vaos.length > 0) {
      pitch = mediana(vaos)
      medidoDeVerdade = true
    }
  }

  return { origem, dir, ultimoLocal, pitch, restanteM, medidoDeVerdade, passouDoFim }
}

/** Gera um LOTE de pontos continuando a partir do túmulo já confirmado mais
 *  avançado na fileira (ou do início do eixo, se nenhum ainda) -- em vez de
 *  reinterpolar a fileira inteira do zero a cada geração. O espaçamento
 *  usado é a MEDIANA real medida entre os túmulos já confirmados (quando
 *  tem 2+, descartando vãos < 0,3m de ponto duplicado/arrasto em cima);
 *  sem histórico ainda, usa PITCH_PADRAO_M -- o staff corrige arrastando
 *  cada ponto do lote antes de gerar. */
export function gerarPontosContinuacao(
  eixo: [number, number][],
  existentes: { lat: number; lng: number }[],
  quantidade: number,
  opcoes?: { janelaVaos?: number }
): { pontos: [number, number][]; pitch: number; restanteM: number; medidoDeVerdade: boolean; passouDoFim: boolean } {
  const { origem, dir, ultimoLocal, pitch, restanteM, medidoDeVerdade, passouDoFim } = medirContinuacao(eixo, existentes, opcoes)

  const kInicial = existentes.length > 0 ? 1 : 0
  const pontos: [number, number][] = []
  for (let i = 0; i < quantidade; i++) {
    const k = kInicial + i
    const distancia = k * pitch
    pontos.push(deMetrosLocal(origem, { x: ultimoLocal.x + dir.x * distancia, y: ultimoLocal.y + dir.y * distancia }))
  }

  return { pontos, pitch, restanteM, medidoDeVerdade, passouDoFim }
}

/** Gera o lote MISTURANDO âncoras reais: túmulos já confirmados no banco +
 *  pontos do preview atual que o staff já arrastou pro lugar certo
 *  (`ajustes`, índice do array -> [lng,lat]). Pontos ENTRE duas âncoras são
 *  interpolados linearmente (o staff já deu as duas pontas daquele trecho);
 *  pontos DEPOIS da última âncora extrapolam usando o passo real medido
 *  entre as duas âncoras mais próximas (não o pitch global, que mediria
 *  errado se as âncoras não forem consecutivas -- ex: arrastou só o #1 e
 *  o #4, o "vão" entre eles é 3 passos, não 1). Sem nenhum ajuste, devolve
 *  bit-a-bit o mesmo resultado de `gerarPontosContinuacao` -- contrato
 *  coberto pelo branch abaixo. */
export function gerarPontosLoteAncorado(
  eixo: [number, number][],
  confirmados: { lat: number; lng: number }[],
  quantidade: number,
  ajustes: Record<number, [number, number]>,
  opcoes?: { janelaVaos?: number }
): {
  pontos: [number, number][]
  pitch: number
  restanteM: number
  medidoDeVerdade: boolean
  passouDoFim: boolean
  ancorasForaDeOrdem: number[]
} {
  const indicesAncora = Object.keys(ajustes)
    .map(Number)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < quantidade)
    .sort((a, b) => a - b)

  if (indicesAncora.length === 0) {
    const base = gerarPontosContinuacao(eixo, confirmados, quantidade, opcoes)
    return { ...base, ancorasForaDeOrdem: [] }
  }

  const medicaoBanco = medirContinuacao(eixo, confirmados, opcoes)
  const origem = medicaoBanco.origem

  const ajustesLatLng = indicesAncora.map((i) => ({ lat: ajustes[i][1], lng: ajustes[i][0] }))
  const medicaoComAncoras = medirContinuacao(eixo, [...confirmados, ...ajustesLatLng], opcoes)
  const dirUsado = medicaoComAncoras.dir
  const pitchGlobal = medicaoComAncoras.pitch

  const projetar = (lngLat: [number, number]) => {
    const l = projetarLocal(origem, lngLat)
    return l.x * dirUsado.x + l.y * dirUsado.y
  }

  type Parada = { indice: number; s: number; lngLat: [number, number] }
  const paradas: Parada[] = []
  if (confirmados.length > 0) {
    const frenteLngLat = deMetrosLocal(origem, medicaoBanco.ultimoLocal)
    paradas.push({ indice: -1, s: projetar(frenteLngLat), lngLat: frenteLngLat })
  }
  indicesAncora.forEach((i) => paradas.push({ indice: i, s: projetar(ajustes[i]), lngLat: ajustes[i] }))
  paradas.sort((a, b) => a.indice - b.indice)

  const ancorasForaDeOrdem: number[] = []
  for (let k = 1; k < paradas.length; k++) {
    if (paradas[k].indice >= 0 && paradas[k].s < paradas[k - 1].s - 0.5 * pitchGlobal) {
      ancorasForaDeOrdem.push(paradas[k].indice)
    }
  }

  const passoLocal = (a: Parada, b: Parada) => {
    const la = projetarLocal(origem, a.lngLat)
    const lb = projetarLocal(origem, b.lngLat)
    const dist = Math.hypot(lb.x - la.x, lb.y - la.y)
    const passos = Math.abs(b.indice - a.indice) || 1
    return dist / passos
  }

  const pontos: [number, number][] = new Array(quantidade)
  indicesAncora.forEach((i) => {
    pontos[i] = ajustes[i]
  })

  for (let i = 0; i < quantidade; i++) {
    if (pontos[i]) continue

    let anterior: Parada | null = null
    let anteAnterior: Parada | null = null
    let proxima: Parada | null = null
    let proximaProxima: Parada | null = null
    for (let k = 0; k < paradas.length; k++) {
      const p = paradas[k]
      if (p.indice < i) {
        anteAnterior = anterior
        anterior = p
      } else if (p.indice > i && !proxima) {
        proxima = p
        proximaProxima = paradas[k + 1] ?? null
      }
    }

    if (anterior && proxima) {
      const la = projetarLocal(origem, anterior.lngLat)
      const lb = projetarLocal(origem, proxima.lngLat)
      const t = (i - anterior.indice) / (proxima.indice - anterior.indice)
      pontos[i] = deMetrosLocal(origem, { x: la.x + (lb.x - la.x) * t, y: la.y + (lb.y - la.y) * t })
    } else if (anterior) {
      const passo = anteAnterior ? passoLocal(anteAnterior, anterior) : pitchGlobal
      const la = projetarLocal(origem, anterior.lngLat)
      const k = i - anterior.indice
      pontos[i] = deMetrosLocal(origem, { x: la.x + dirUsado.x * passo * k, y: la.y + dirUsado.y * passo * k })
    } else if (proxima) {
      const passo = proximaProxima ? passoLocal(proxima, proximaProxima) : pitchGlobal
      const lb = projetarLocal(origem, proxima.lngLat)
      const k = i - proxima.indice
      pontos[i] = deMetrosLocal(origem, { x: lb.x + dirUsado.x * passo * k, y: lb.y + dirUsado.y * passo * k })
    } else {
      const k = i + 1
      pontos[i] = deMetrosLocal(origem, {
        x: medicaoBanco.ultimoLocal.x + dirUsado.x * pitchGlobal * k,
        y: medicaoBanco.ultimoLocal.y + dirUsado.y * pitchGlobal * k,
      })
    }
  }

  return {
    pontos,
    pitch: pitchGlobal,
    restanteM: medicaoComAncoras.restanteM,
    medidoDeVerdade: medicaoComAncoras.medidoDeVerdade,
    passouDoFim: medicaoComAncoras.passouDoFim,
    ancorasForaDeOrdem,
  }
}

/** Índices de `pontos` que caem em cima (ou perto demais) de um túmulo já
 *  confirmado da mesma fileira -- rede de segurança pro "Gerar" não gravar
 *  um lote por cima do que o staff já organizou (a causa real do bug era
 *  ler posição desatualizada, isso aqui pega qualquer recorrência futura
 *  do mesmo jeito de bug, não só essa). */
export function acharSobreposicoes(pontos: [number, number][], existentes: { lat: number; lng: number }[], limiarM: number): number[] {
  const indices: number[] = []
  pontos.forEach(([lng, lat], i) => {
    const tocaAlgum = existentes.some((e) => distanciaMetros(lat, lng, e.lat, e.lng) < limiarM)
    if (tocaAlgum) indices.push(i)
  })
  return indices
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
