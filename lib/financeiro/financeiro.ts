import type { Origem } from "./tipos"

// Líquido por memorial: plano mensal p, 12 meses, 6% de taxa, R$ 2,77 fixos por ano.
export const LIQ = (p: number) => (p * 12 * 0.94 - 2.77) / 12

// Líquido quando o parceiro fica com a fatia pct.
export const LIQP = (p: number, pct: number) =>
  (p * (1 - pct) * 12 * 0.94 - 2.77) / 12

// Memoriais nossos necessários para cobrir o custo K.
export const EQ = (p: number, K: number) => Math.ceil(K / LIQ(p))

// Idem, já contando np memoriais de parceiros.
export const EQP = (p: number, np: number, pct: number, K: number) =>
  Math.max(0, Math.ceil((K - np * LIQP(p, pct)) / LIQ(p)))

export const saldo = (n: number, receitaMes: number, K: number) =>
  n * (receitaMes - K)

export const receita = (
  origem: Origem,
  nN: number,
  nP: number,
  p: number,
  pct: number,
) =>
  (origem !== "Parceiros" ? nN * LIQ(p) : 0) +
  (origem !== "Nossos" ? nP * LIQP(p, pct) : 0)

export type PontoMes = {
  mes: string
  receita: number
  resultado: number
  saldoAcum: number
  memoriais: number
}

export const MESES_FUTUROS = [
  "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out",
]

// Série de 12 meses. Sem simulação a receita é zero (real). Com simulação,
// entram sn novos nossos e spn novos de parceiros por mês, crescendo 15% ao mês.
export function serie(opts: {
  origem: Origem
  simulacao: boolean
  K: number
  p: number
  pct: number
  sn: number
  spn: number
}): PontoMes[] {
  let a = 0
  let b = 0
  let acum = 0
  return MESES_FUTUROS.map((mes, i) => {
    if (opts.simulacao) {
      a += Math.round(opts.sn * (1 + i * 0.15))
      b += Math.round(opts.spn * (1 + i * 0.15))
    }
    const rec = receita(opts.origem, a, b, opts.p, opts.pct)
    const resultado = rec - opts.K
    acum += resultado
    return {
      mes,
      receita: rec,
      resultado,
      saldoAcum: acum,
      memoriais: (opts.origem !== "Parceiros" ? a : 0) + (opts.origem !== "Nossos" ? b : 0),
    }
  })
}

// ---------- Equilíbrio ----------
export type PontoEquilibrio = {
  memoriais: string
  "Custo fixo": number
  "Receita nossa": number
  "Receita com parceiros (simulação)": number
}

// 11 pontos de 0 a 1,43 vezes o ponto de equilíbrio; o ponto 7 cai exatamente em EQ.
// Parceiros simulados: razao memoriais de parceiro para cada memorial nosso.
export function serieEquilibrio(o: { p: number; pct: number; K: number; razao: number }): PontoEquilibrio[] {
  const eq = EQ(o.p, o.K)
  return Array.from({ length: 11 }, (_, i) => {
    const n = Math.round((i * eq) / 7)
    const np = Math.round(n * o.razao)
    return {
      memoriais: String(n),
      "Custo fixo": o.K,
      "Receita nossa": n * LIQ(o.p),
      "Receita com parceiros (simulação)": n * LIQ(o.p) + np * LIQP(o.p, o.pct),
    }
  })
}

// ---------- Rentabilidade ----------
export type DivisaoMemorial = {
  cobrado: number
  parteParceiro: number
  nossaParte: number
  /** quanto da nossa parte bruta vai para imposto 6% e Asaas */
  descontos: number
}

// Por memorial, em R$ por mês (preço mensal p).
export function divisaoPorMemorial(p: number, pct: number, origem: "Nossos" | "Parceiros"): DivisaoMemorial {
  const parteParceiro = origem === "Parceiros" ? p * pct : 0
  const nossaParte = origem === "Parceiros" ? LIQP(p, pct) : LIQ(p)
  return { cobrado: p, parteParceiro, nossaParte, descontos: p - parteParceiro - nossaParte }
}

// Margem: quanto de cada real cobrado fica para nós (0 a 1).
export const margem = (p: number, pct: number, origem: "Nossos" | "Parceiros") =>
  divisaoPorMemorial(p, pct, origem).nossaParte / p

// ---------- Crescimento ----------
// Memoriais NOVOS por mês na simulação (a série acumulada de serie() soma estes valores).
export function novosPorMesSimulados(sn: number, spn: number) {
  return MESES_FUTUROS.map((mes, i) => ({
    mes,
    Nossos: Math.round(sn * (1 + i * 0.15)),
    Parceiros: Math.round(spn * (1 + i * 0.15)),
  }))
}

// Variação percentual de um mês para o outro; null quando o mês anterior é zero.
export function variacaoPct(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : (atual - anterior) / anterior
}

// ---------- Visão do Parceiro ----------
export type StatusMemorial = "Pago" | "Aguardando pagamento" | "Atrasado" | "Cancelado"
export type MemorialParceiro = { familia: string; criadoEm: string; valor: number; status: StatusMemorial }

// O parceiro cobra do cliente e fica com a parte dele (pct); o resto é nosso.
export function resumoParceiro(lista: MemorialParceiro[], pct: number, mes = "11/2026") {
  const pagos = lista.filter((m) => m.status === "Pago")
  const emAberto = lista.filter((m) => m.status === "Aguardando pagamento" || m.status === "Atrasado")
  const pagaram = pagos.reduce((t, m) => t + m.valor, 0)
  const faltaPagar = emAberto.reduce((t, m) => t + m.valor, 0)
  return {
    cadastrados: lista.length,
    cadastradosNoMes: lista.filter((m) => m.criadoEm.endsWith(mes)).length,
    clientesPagaram: pagaram,
    vocePorRecebe: pagaram * pct,
    faltaReceber: faltaPagar * pct,
  }
}
