import { comprimentoPolilinha } from '@/lib/geo'
import { simplificarLinha } from '@/lib/simplificarLinha'

export type Pt = [number, number]

const PASSO_M = 3

/** Controle da Bézier quadrática pra que a curva passe EXATAMENTE por h no meio (t = 0,5). */
export function controleDoPuxador(a: Pt, b: Pt, h: Pt): Pt {
  return [2 * h[0] - (a[0] + b[0]) / 2, 2 * h[1] - (a[1] + b[1]) / 2]
}

/** Ponto do meio do trecho (onde fica a bolinha): reto = ponto médio; curvo = Bézier em t = 0,5. */
export function pontoMedioTrecho(a: Pt, b: Pt, c: Pt | null): Pt {
  if (!c) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return [0.25 * a[0] + 0.5 * c[0] + 0.25 * b[0], 0.25 * a[1] + 0.5 * c[1] + 0.25 * b[1]]
}

/** Bézier quadrática a->b com controle c, densificada (~1 ponto a cada 3 m). Inclui a e b. */
export function bezierDensa(a: Pt, c: Pt, b: Pt): Pt[] {
  const grosso: Pt[] = []
  for (let i = 0; i <= 8; i++) grosso.push(pontoBezier(a, c, b, i / 8))
  const n = Math.max(2, Math.ceil(comprimentoPolilinha(grosso) / PASSO_M))
  const saida: Pt[] = []
  for (let i = 0; i <= n; i++) saida.push(pontoBezier(a, c, b, i / n))
  return saida
}

function pontoBezier(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}

/** Monta a polilinha final: trecho com controle vira curva densa, sem controle fica reto. */
export function montarEixo(ancoras: Pt[], ctrl: (Pt | null)[]): Pt[] {
  if (ancoras.length === 0) return []
  const saida: Pt[] = [ancoras[0]]
  for (let i = 1; i < ancoras.length; i++) {
    const c = ctrl[i - 1]
    if (c) saida.push(...bezierDensa(ancoras[i - 1], c, ancoras[i]).slice(1))
    else saida.push(ancoras[i])
  }
  return saida
}

/** Âncoras editáveis de uma polilinha sem metadados: poucos pontos = todos; muitos (já densa) = simplificada a 0,3 m. */
export function ancorasIniciais(coords: Pt[]): Pt[] {
  return coords.length <= 12 ? coords.map((p) => [p[0], p[1]] as Pt) : simplificarLinha(coords, 0.3)
}
