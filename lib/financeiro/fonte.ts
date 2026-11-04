import type { Fonte } from './tipos.ts'

/** Regra de etiqueta: REAL só quando os dados vieram da API nesta carga; senão EXEMPLO. */
export function fonteEfetiva(fonte: Fonte, dadosVieramDaApi: boolean): Fonte {
  return fonte === 'REAL' && !dadosVieramDaApi ? 'EXEMPLO' : fonte
}
