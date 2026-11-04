// Consultas SOMENTE LEITURA do Legado Financeiro. Nenhuma função aqui escreve no banco.
// O cliente do Supabase (service role) é passado por quem chama (rota de API).
import type { MesMemoriais } from './tipos.ts'

/** Colunas lidas de `homenagens` (lista explícita, nunca select '*'). */
export const COLUNAS_HOMENAGENS = 'id, created_at, parceiro_id, origem_cadastro'
/** Colunas lidas de `parceiros_b2b` (lista explícita). */
export const COLUNAS_PARCEIROS = 'id, nome_fantasia, razao_social, plano_contratado, status_pagamento, created_at'

export type LinhaMemorial = {
  id: string
  created_at: string
  parceiro_id: string | null
  origem_cadastro: string | null
}

export type LinhaParceiro = {
  id: string
  nome_fantasia: string | null
  razao_social: string | null
  plano_contratado: string | null
  status_pagamento: string | null
  created_at: string
}

export type ParceiroReal = {
  id: string
  nome: string
  plano: string
  status: string
  criadaEm: string // dd/mm/aaaa
  memoriais: number
}

export type DadosFinanceiros = {
  /** ISO do momento da consulta */
  consultadoEm: string
  totalMemoriais: number
  memoriaisPorMes: MesMemoriais[]
  memoriaisPorMesOrigem: { mes: string; Nossos: number; Parceiros: number }[]
  memoriaisPorOrigem: {
    mapaCemiterio: number
    central: number
    parceiroPortal: number
    familia: number
    semOrigem: number
    /** memoriais ligados a algum parceiro (parceiro_id preenchido) */
    deParceiros: number
  }
  parceiros: ParceiroReal[]
}

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Mês/ano no horário de Brasília (UTC-3), para o memorial das 22h não cair no mês seguinte. */
function mesAno(iso: string): { a: number; m: number } | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const d = new Date(t - 3 * 3600 * 1000)
  return { a: d.getUTCFullYear(), m: d.getUTCMonth() }
}

export function formatarData(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const d = new Date(t - 3 * 3600 * 1000)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

/** Agrupa memoriais por mês e origem. Meses sem memorial dentro do intervalo entram com zero. */
export function agruparMemoriais(linhas: LinhaMemorial[], agora: Date = new Date()) {
  const vistos = linhas.map((l) => mesAno(l.created_at)).filter((x): x is { a: number; m: number } => x !== null)
  const hoje = mesAno(agora.toISOString())!
  const chaves: { a: number; m: number }[] = []
  if (vistos.length > 0) {
    const ini = vistos.reduce((p, c) => (c.a * 12 + c.m < p.a * 12 + p.m ? c : p))
    for (let k = ini.a * 12 + ini.m; k <= hoje.a * 12 + hoje.m; k++) chaves.push({ a: Math.floor(k / 12), m: k % 12 })
  }
  const cruzaAno = chaves.length > 0 && chaves[0].a !== chaves[chaves.length - 1].a
  const rotulo = (c: { a: number; m: number }) => NOMES_MES[c.m] + (cruzaAno ? `/${String(c.a).slice(2)}` : '')
  const porMes = chaves.map((c) => ({ mes: rotulo(c), total: 0, Nossos: 0, Parceiros: 0 }))
  const origem = { mapaCemiterio: 0, central: 0, parceiroPortal: 0, familia: 0, semOrigem: 0, deParceiros: 0 }
  for (const l of linhas) {
    const ma = mesAno(l.created_at)
    if (ma) {
      const idx = chaves.findIndex((c) => c.a === ma.a && c.m === ma.m)
      if (idx >= 0) {
        porMes[idx].total += 1
        if (l.parceiro_id) porMes[idx].Parceiros += 1
        else porMes[idx].Nossos += 1
      }
    }
    if (l.parceiro_id) origem.deParceiros += 1
    switch (l.origem_cadastro) {
      case 'mapa_cemiterio': origem.mapaCemiterio += 1; break
      case 'central': origem.central += 1; break
      case 'parceiro': origem.parceiroPortal += 1; break
      case 'familia': origem.familia += 1; break
      default: origem.semOrigem += 1
    }
  }
  return {
    totalMemoriais: linhas.length,
    memoriaisPorMes: porMes.map((x) => ({ mes: x.mes, total: x.total })),
    memoriaisPorMesOrigem: porMes.map((x) => ({ mes: x.mes, Nossos: x.Nossos, Parceiros: x.Parceiros })),
    memoriaisPorOrigem: origem,
  }
}

export function montarParceiros(parceiros: LinhaParceiro[], memoriais: LinhaMemorial[]): ParceiroReal[] {
  return parceiros.map((p) => ({
    id: p.id,
    nome: p.nome_fantasia || p.razao_social || 'Parceiro sem nome',
    plano: p.plano_contratado || '—',
    status: p.status_pagamento || '—',
    criadaEm: formatarData(p.created_at),
    memoriais: memoriais.filter((m) => m.parceiro_id === p.id).length,
  }))
}

/** Filtro de segurança do portal do parceiro: só o que pertence àquele parceiro. */
export function soDoParceiro<T extends { parceiro_id: string | null }>(linhas: T[], parceiroId: string): T[] {
  return linhas.filter((l) => l.parceiro_id === parceiroId)
}

export function montarDadosFinanceiros(
  memoriais: LinhaMemorial[],
  parceiros: LinhaParceiro[],
  agora: Date = new Date(),
): DadosFinanceiros {
  return {
    consultadoEm: agora.toISOString(),
    ...agruparMemoriais(memoriais, agora),
    parceiros: montarParceiros(parceiros, memoriais),
  }
}

// ---------- Leitura no Supabase (somente SELECT) ----------
const PAGINA = 1000
const LIMITE_LINHAS = 20000

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function lerMemoriais(supabase: any, parceiroId?: string): Promise<LinhaMemorial[]> {
  const todas: LinhaMemorial[] = []
  for (let ini = 0; ini < LIMITE_LINHAS; ini += PAGINA) {
    let q = supabase.from('homenagens').select(COLUNAS_HOMENAGENS).order('created_at', { ascending: true }).order('id', { ascending: true })
    if (parceiroId) q = q.eq('parceiro_id', parceiroId)
    const { data, error } = await q.range(ini, ini + PAGINA - 1)
    if (error) throw new Error('Falha ao ler memoriais')
    todas.push(...((data as LinhaMemorial[]) || []))
    if (!data || data.length < PAGINA) break
  }
  return todas
}

export async function lerParceiros(supabase: any, parceiroId?: string): Promise<LinhaParceiro[]> {
  let q = supabase.from('parceiros_b2b').select(COLUNAS_PARCEIROS).order('created_at', { ascending: true })
  if (parceiroId) q = q.eq('id', parceiroId)
  const { data, error } = await q
  if (error) throw new Error('Falha ao ler parceiros')
  return (data as LinhaParceiro[]) || []
}
