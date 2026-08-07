import { deMetrosLocal, distanciaMetros, projetarLocal } from './geo'

export interface RuaMapeada {
  id: string
  numero: number
  nome: string | null
  coordenadas: [number, number][] // [lng, lat], 2+ vertices
}

export interface OpcoesRota {
  toleranciaNoM?: number // default 2.0 -- junta vertices/pontas quase encostados e detecta encosto em T
  maxLigacaoEntradaM?: number // default 60 -- portaria mais longe que isso da rede: nao usa rede
  maxLigacaoTumuloM?: number // default 80 -- tumulo mais longe que isso da rede: nao usa rede
}

export interface ResultadoRota {
  coordenadas: [number, number][] // polilinha final [lng,lat]: portaria -> ... -> tumulo
  distanciaM: number
  distanciaRetaM: number
  entradaAteRedeM: number
  redeAteTumuloM: number
  usouRede: boolean
  motivo?: 'sem_ruas' | 'entrada_longe' | 'tumulo_longe' | 'sem_caminho'
}

export interface DiagnosticoRede {
  totalRuas: number
  comprimentoTotalM: number
  idsDesconectadas: string[]
}

type Pt = { x: number; y: number }
type Segmento = { ruaId: string; a: Pt; b: Pt }

const TOLERANCIA_PADRAO_M = 2.0
const MAX_LIGACAO_ENTRADA_PADRAO_M = 60
const MAX_LIGACAO_TUMULO_PADRAO_M = 80

/** Índice espacial simples (hash de grade) -- evita comparar cada segmento
 *  com todos os outros (O(n²)) na hora de achar cruzamentos/encostos. Escala
 *  de cemitério (algumas centenas de segmentos) fica tranquila com isso. */
class IndiceGrade<T> {
  private celula: number
  private baldes = new Map<string, T[]>()

  constructor(celula: number) {
    this.celula = Math.max(celula, 0.5)
  }

  private chave(cx: number, cy: number) {
    return `${cx}:${cy}`
  }

  inserirBBox(minX: number, minY: number, maxX: number, maxY: number, item: T) {
    const cx0 = Math.floor(minX / this.celula)
    const cx1 = Math.floor(maxX / this.celula)
    const cy0 = Math.floor(minY / this.celula)
    const cy1 = Math.floor(maxY / this.celula)
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const k = this.chave(cx, cy)
        const lista = this.baldes.get(k)
        if (lista) lista.push(item)
        else this.baldes.set(k, [item])
      }
    }
  }

  candidatosBBox(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const cx0 = Math.floor(minX / this.celula)
    const cx1 = Math.floor(maxX / this.celula)
    const cy0 = Math.floor(minY / this.celula)
    const cy1 = Math.floor(maxY / this.celula)
    const vistos = new Set<T>()
    const resultado: T[] = []
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const lista = this.baldes.get(this.chave(cx, cy))
        if (!lista) continue
        for (const item of lista) {
          if (!vistos.has(item)) {
            vistos.add(item)
            resultado.push(item)
          }
        }
      }
    }
    return resultado
  }

  candidatosPonto(x: number, y: number, raio: number): T[] {
    return this.candidatosBBox(x - raio, y - raio, x + raio, y + raio)
  }
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Interseção real (X) entre dois segmentos -- produto vetorial 2D padrão.
 *  Paralelos/colineares são ignorados (não é o caso comum de rua desenhada
 *  à mão, e tratar colinear duplicado só complicaria sem ganho real aqui). */
function interseccaoSegmentos(s: Segmento, t: Segmento): { ts: number; tt: number } | null {
  const r = { x: s.b.x - s.a.x, y: s.b.y - s.a.y }
  const u = { x: t.b.x - t.a.x, y: t.b.y - t.a.y }
  const d = r.x * u.y - r.y * u.x
  if (Math.abs(d) < 1e-9) return null
  const w = { x: t.a.x - s.a.x, y: t.a.y - s.a.y }
  const ts = (w.x * u.y - w.y * u.x) / d
  const tt = (w.x * r.y - w.y * r.x) / d
  if (ts < 0 || ts > 1 || tt < 0 || tt > 1) return null
  return { ts, tt }
}

/** Projeta um ponto no segmento s, devolve o parâmetro t (0..1) e a distância
 *  perpendicular -- usado tanto pro encosto em T quanto pra ligar entrada/túmulo
 *  na rede. */
function projetarNoSegmento(p: Pt, s: Segmento): { t: number; d: number } {
  const dx = s.b.x - s.a.x
  const dy = s.b.y - s.a.y
  const comprimento2 = dx * dx + dy * dy
  if (comprimento2 < 1e-9) return { t: 0, d: dist(p, s.a) }
  let t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / comprimento2
  t = Math.max(0, Math.min(1, t))
  const proj = { x: s.a.x + dx * t, y: s.a.y + dy * t }
  return { t, d: dist(p, proj) }
}

interface RedeConstruida {
  nos: Pt[]
  adjacencia: { para: number; peso: number }[][]
  // sub-segmentos finais, cada um com os índices de nó das duas pontas -- usado
  // pra ligar entrada/túmulo (achar o mais próximo) e pro diagnóstico por rua.
  subSegmentos: { ruaId: string; noA: number; noB: number; a: Pt; b: Pt }[]
  grade: IndiceGrade<number> // aponta pra índice em subSegmentos
}

function construirRede(origemGeo: [number, number], ruas: RuaMapeada[], toleranciaM: number): RedeConstruida | null {
  if (ruas.length === 0) return null

  const segmentosBrutos: Segmento[] = []
  for (const rua of ruas) {
    const locais = rua.coordenadas.map((c) => projetarLocal(origemGeo, c))
    for (let i = 0; i < locais.length - 1; i++) {
      segmentosBrutos.push({ ruaId: rua.id, a: locais[i], b: locais[i + 1] })
    }
  }
  if (segmentosBrutos.length === 0) return null

  const celula = Math.max(10, toleranciaM * 4)
  const gradeSeg = new IndiceGrade<number>(celula)
  segmentosBrutos.forEach((s, i) => {
    const minX = Math.min(s.a.x, s.b.x) - toleranciaM
    const maxX = Math.max(s.a.x, s.b.x) + toleranciaM
    const minY = Math.min(s.a.y, s.b.y) - toleranciaM
    const maxY = Math.max(s.a.y, s.b.y) + toleranciaM
    gradeSeg.inserirBBox(minX, minY, maxX, maxY, i)
  })

  // Cortes (parametro t em [0,1]) por segmento -- cruzamento real + encosto em T.
  const cortes: number[][] = segmentosBrutos.map(() => [0, 1])

  for (let i = 0; i < segmentosBrutos.length; i++) {
    const s = segmentosBrutos[i]
    const minX = Math.min(s.a.x, s.b.x) - toleranciaM
    const maxX = Math.max(s.a.x, s.b.x) + toleranciaM
    const minY = Math.min(s.a.y, s.b.y) - toleranciaM
    const maxY = Math.max(s.a.y, s.b.y) + toleranciaM
    const candidatos = gradeSeg.candidatosBBox(minX, minY, maxX, maxY)

    for (const j of candidatos) {
      if (j <= i) continue
      const t = segmentosBrutos[j]

      const cruz = interseccaoSegmentos(s, t)
      if (cruz) {
        cortes[i].push(cruz.ts)
        cortes[j].push(cruz.tt)
        continue
      }

      // Encosto em T: ponta de um segmento quase em cima do meio do outro.
      for (const ponta of [t.a, t.b]) {
        const { t: tp, d } = projetarNoSegmento(ponta, s)
        if (d <= toleranciaM && tp > 0.001 && tp < 0.999) cortes[i].push(tp)
      }
      for (const ponta of [s.a, s.b]) {
        const { t: tp, d } = projetarNoSegmento(ponta, t)
        if (d <= toleranciaM && tp > 0.001 && tp < 0.999) cortes[j].push(tp)
      }
    }
  }

  // Nós: dedup por proximidade (solda pontas quase encostadas).
  const nos: Pt[] = []
  const gradeNos = new IndiceGrade<number>(Math.max(toleranciaM, 0.5))

  function buscarOuCriarNo(p: Pt): number {
    const candidatos = gradeNos.candidatosPonto(p.x, p.y, toleranciaM)
    let melhor = -1
    let melhorDist = Infinity
    for (const idx of candidatos) {
      const d = dist(nos[idx], p)
      if (d <= toleranciaM && d < melhorDist) {
        melhor = idx
        melhorDist = d
      }
    }
    if (melhor >= 0) return melhor
    const idx = nos.length
    nos.push(p)
    gradeNos.inserirBBox(p.x, p.y, p.x, p.y, idx)
    return idx
  }

  const adjacencia: { para: number; peso: number }[][] = []
  const subSegmentos: RedeConstruida['subSegmentos'] = []
  const gradeSub = new IndiceGrade<number>(celula)

  function garantirNo(idx: number) {
    while (adjacencia.length <= idx) adjacencia.push([])
  }

  function pontoEm(s: Segmento, t: number): Pt {
    return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }
  }

  segmentosBrutos.forEach((s, i) => {
    const ts = Array.from(new Set(cortes[i])).sort((a, b) => a - b)
    const comprimentoTotal = dist(s.a, s.b)
    for (let k = 0; k < ts.length - 1; k++) {
      if ((ts[k + 1] - ts[k]) * comprimentoTotal < 0.05) continue // sub-segmento residual, ignora
      const pA = pontoEm(s, ts[k])
      const pB = pontoEm(s, ts[k + 1])
      const noA = buscarOuCriarNo(pA)
      const noB = buscarOuCriarNo(pB)
      if (noA === noB) continue
      const peso = dist(pA, pB)
      garantirNo(noA)
      garantirNo(noB)
      adjacencia[noA].push({ para: noB, peso })
      adjacencia[noB].push({ para: noA, peso })

      const idxSub = subSegmentos.length
      subSegmentos.push({ ruaId: s.ruaId, noA, noB, a: pA, b: pB })
      const minX = Math.min(pA.x, pB.x)
      const maxX = Math.max(pA.x, pB.x)
      const minY = Math.min(pA.y, pB.y)
      const maxY = Math.max(pA.y, pB.y)
      gradeSub.inserirBBox(minX, minY, maxX, maxY, idxSub)
    }
  })

  if (subSegmentos.length === 0) return null

  return { nos, adjacencia, subSegmentos, grade: gradeSub }
}

/** Liga um ponto externo (entrada ou túmulo) na rede via nó virtual -- não
 *  mexe na estrutura da rede, só adiciona arestas temporárias pra essa
 *  chamada. Devolve null se o ponto mais próximo da rede estiver além do
 *  limite (dispara o fallback de linha reta). */
function ligarNaRede(
  ponto: Pt,
  rede: RedeConstruida,
  limiteM: number
): { noVirtual: number; distM: number; proj: Pt } | null {
  const candidatos = rede.grade.candidatosPonto(ponto.x, ponto.y, limiteM)
  let melhor: { idx: number; t: number; d: number } | null = null
  for (const idx of candidatos) {
    const sub = rede.subSegmentos[idx]
    const { t, d } = projetarNoSegmento(ponto, { ruaId: sub.ruaId, a: sub.a, b: sub.b })
    if (!melhor || d < melhor.d) melhor = { idx, t, d }
  }
  if (!melhor || melhor.d > limiteM) return null

  const sub = rede.subSegmentos[melhor.idx]
  const proj = { x: sub.a.x + (sub.b.x - sub.a.x) * melhor.t, y: sub.a.y + (sub.b.y - sub.a.y) * melhor.t }
  const noVirtual = rede.adjacencia.length
  const arestas: { para: number; peso: number }[] = []
  const comprimentoSub = dist(sub.a, sub.b)
  arestas.push({ para: sub.noA, peso: melhor.d + melhor.t * comprimentoSub })
  arestas.push({ para: sub.noB, peso: melhor.d + (1 - melhor.t) * comprimentoSub })
  rede.adjacencia.push(arestas)
  rede.adjacencia[sub.noA].push({ para: noVirtual, peso: arestas[0].peso })
  rede.adjacencia[sub.noB].push({ para: noVirtual, peso: arestas[1].peso })

  return { noVirtual, distM: melhor.d, proj }
}

/** Heap binário mínimo, só o suficiente pro Dijkstra abaixo -- rede de
 *  cemitério tem no máximo algumas centenas de nós, não precisa de nada
 *  mais sofisticado que isso. */
class HeapBinario {
  private itens: { prioridade: number; valor: number }[] = []

  vazio() {
    return this.itens.length === 0
  }

  inserir(prioridade: number, valor: number) {
    this.itens.push({ prioridade, valor })
    let i = this.itens.length - 1
    while (i > 0) {
      const pai = (i - 1) >> 1
      if (this.itens[pai].prioridade <= this.itens[i].prioridade) break
      ;[this.itens[pai], this.itens[i]] = [this.itens[i], this.itens[pai]]
      i = pai
    }
  }

  remover(): { prioridade: number; valor: number } {
    const topo = this.itens[0]
    const ultimo = this.itens.pop()!
    if (this.itens.length > 0) {
      this.itens[0] = ultimo
      let i = 0
      for (;;) {
        const e = 2 * i + 1
        const d = 2 * i + 2
        let menor = i
        if (e < this.itens.length && this.itens[e].prioridade < this.itens[menor].prioridade) menor = e
        if (d < this.itens.length && this.itens[d].prioridade < this.itens[menor].prioridade) menor = d
        if (menor === i) break
        ;[this.itens[menor], this.itens[i]] = [this.itens[i], this.itens[menor]]
        i = menor
      }
    }
    return topo
  }
}

function dijkstra(adjacencia: { para: number; peso: number }[][], origem: number, destino: number): number[] | null {
  const n = adjacencia.length
  const distancias = new Array(n).fill(Infinity)
  const anterior = new Array(n).fill(-1)
  const fechado = new Uint8Array(n)
  distancias[origem] = 0

  const heap = new HeapBinario()
  heap.inserir(0, origem)

  while (!heap.vazio()) {
    const { valor: u } = heap.remover()
    if (fechado[u]) continue
    fechado[u] = 1
    if (u === destino) break
    for (const { para: v, peso } of adjacencia[u]) {
      const d = distancias[u] + peso
      if (d < distancias[v]) {
        distancias[v] = d
        anterior[v] = u
        heap.inserir(d, v)
      }
    }
  }

  if (distancias[destino] === Infinity) return null
  const caminho: number[] = []
  for (let x = destino; x !== -1; x = anterior[x]) caminho.push(x)
  return caminho.reverse()
}

function simplificar(pontos: [number, number][]): [number, number][] {
  const resultado: [number, number][] = []
  for (const p of pontos) {
    const ultimo = resultado[resultado.length - 1]
    if (!ultimo || distanciaMetros(ultimo[1], ultimo[0], p[1], p[0]) >= 0.2) resultado.push(p)
  }
  return resultado
}

function linhaReta(entrada: { lat: number; lng: number }, tumulo: { lat: number; lng: number }): [number, number][] {
  return [
    [entrada.lng, entrada.lat],
    [tumulo.lng, tumulo.lat],
  ]
}

/** Calcula a rota real da portaria até o túmulo seguindo as ruas mapeadas do
 *  cemitério. Sem rua mapeada (ou portaria/túmulo longe demais de qualquer
 *  rua), devolve a linha reta de sempre (`usouRede: false`) -- nunca lança
 *  exceção, nunca deixa a seção "Como Chegar" sem rota. */
export function calcularRota(
  entrada: { lat: number; lng: number },
  tumulo: { lat: number; lng: number },
  ruas: RuaMapeada[],
  opcoes?: OpcoesRota
): ResultadoRota {
  const distanciaRetaM = distanciaMetros(entrada.lat, entrada.lng, tumulo.lat, tumulo.lng)
  const fallback = (motivo: ResultadoRota['motivo']): ResultadoRota => ({
    coordenadas: linhaReta(entrada, tumulo),
    distanciaM: distanciaRetaM,
    distanciaRetaM,
    entradaAteRedeM: 0,
    redeAteTumuloM: 0,
    usouRede: false,
    motivo,
  })

  const tolerancia = opcoes?.toleranciaNoM ?? TOLERANCIA_PADRAO_M
  const maxEntrada = opcoes?.maxLigacaoEntradaM ?? MAX_LIGACAO_ENTRADA_PADRAO_M
  const maxTumulo = opcoes?.maxLigacaoTumuloM ?? MAX_LIGACAO_TUMULO_PADRAO_M

  if (ruas.length === 0) return fallback('sem_ruas')

  const origemGeo: [number, number] = [entrada.lng, entrada.lat]
  const rede = construirRede(origemGeo, ruas, tolerancia)
  if (!rede) return fallback('sem_ruas')

  const pEntrada = projetarLocal(origemGeo, [entrada.lng, entrada.lat])
  const pTumulo = projetarLocal(origemGeo, [tumulo.lng, tumulo.lat])

  const ligEntrada = ligarNaRede(pEntrada, rede, maxEntrada)
  if (!ligEntrada) return fallback('entrada_longe')

  const ligTumulo = ligarNaRede(pTumulo, rede, maxTumulo)
  if (!ligTumulo) return fallback('tumulo_longe')

  const caminho = dijkstra(rede.adjacencia, ligEntrada.noVirtual, ligTumulo.noVirtual)
  if (!caminho) return fallback('sem_caminho')

  const pontosLocais: Pt[] = [pEntrada, ligEntrada.proj]
  for (const idxNo of caminho) {
    // pula os dois nos virtuais (entrada/tumulo) -- ja cobertos acima/abaixo
    if (idxNo === ligEntrada.noVirtual || idxNo === ligTumulo.noVirtual) continue
    pontosLocais.push(rede.nos[idxNo])
  }
  pontosLocais.push(ligTumulo.proj, pTumulo)

  const coordenadas = simplificar(pontosLocais.map((p) => deMetrosLocal(origemGeo, p)))

  let distanciaM = 0
  for (let i = 0; i < coordenadas.length - 1; i++) {
    distanciaM += distanciaMetros(coordenadas[i][1], coordenadas[i][0], coordenadas[i + 1][1], coordenadas[i + 1][0])
  }

  return {
    coordenadas,
    distanciaM,
    distanciaRetaM,
    entradaAteRedeM: ligEntrada.distM,
    redeAteTumuloM: ligTumulo.distM,
    usouRede: true,
  }
}

/** Pra Central: quais ruas mapeadas não têm caminho até a portaria -- pega
 *  rua desenhada "flutuando" (sem encostar em nenhuma outra) antes que o
 *  Rafael descubra por acidente meses depois, olhando um memorial real. */
export function diagnosticarRede(
  entrada: { lat: number; lng: number } | null,
  ruas: RuaMapeada[],
  opcoes?: OpcoesRota
): DiagnosticoRede {
  const comprimentoTotalM = ruas.reduce((soma, r) => {
    let c = 0
    for (let i = 0; i < r.coordenadas.length - 1; i++) {
      const [lng1, lat1] = r.coordenadas[i]
      const [lng2, lat2] = r.coordenadas[i + 1]
      c += distanciaMetros(lat1, lng1, lat2, lng2)
    }
    return soma + c
  }, 0)

  const base: DiagnosticoRede = { totalRuas: ruas.length, comprimentoTotalM, idsDesconectadas: [] }
  if (!entrada || ruas.length === 0) return base

  const tolerancia = opcoes?.toleranciaNoM ?? TOLERANCIA_PADRAO_M
  const maxEntrada = opcoes?.maxLigacaoEntradaM ?? MAX_LIGACAO_ENTRADA_PADRAO_M
  const origemGeo: [number, number] = [entrada.lng, entrada.lat]
  const rede = construirRede(origemGeo, ruas, tolerancia)
  if (!rede) return { ...base, idsDesconectadas: ruas.map((r) => r.id) }

  const pEntrada = projetarLocal(origemGeo, [entrada.lng, entrada.lat])
  const lig = ligarNaRede(pEntrada, rede, maxEntrada)
  if (!lig) return { ...base, idsDesconectadas: ruas.map((r) => r.id) }

  // BFS/Dijkstra a partir da entrada, marca nos alcancados.
  const alcancado = new Uint8Array(rede.adjacencia.length)
  const distancias = new Array(rede.adjacencia.length).fill(Infinity)
  distancias[lig.noVirtual] = 0
  const heap = new HeapBinario()
  heap.inserir(0, lig.noVirtual)
  while (!heap.vazio()) {
    const { valor: u } = heap.remover()
    if (alcancado[u]) continue
    alcancado[u] = 1
    for (const { para: v, peso } of rede.adjacencia[u]) {
      const d = distancias[u] + peso
      if (d < distancias[v]) {
        distancias[v] = d
        heap.inserir(d, v)
      }
    }
  }

  const ruasAlcancadas = new Set<string>()
  for (const sub of rede.subSegmentos) {
    if (alcancado[sub.noA] || alcancado[sub.noB]) ruasAlcancadas.add(sub.ruaId)
  }

  const idsDesconectadas = ruas.filter((r) => !ruasAlcancadas.has(r.id)).map((r) => r.id)
  return { ...base, idsDesconectadas }
}
