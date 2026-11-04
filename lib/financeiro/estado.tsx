"use client"

import React from "react"
import { custosIniciais, memoriaisPorMes as snapMes, memoriaisPorMesOrigem as snapMesOrigem, memoriaisPorOrigem as snapOrigem, parceiros as snapParceiros, DATA_SNAPSHOT } from "./padroes"
import type { DadosFinanceiros } from "./consultas"
import type { Custo, Origem } from "./tipos"

export type Modo = "simples" | "detalhado"
export type Tema = "claro" | "escuro"

/** Dados de memoriais/parceiros no formato que as telas usam. */
export type DadosTela = {
  /** true = veio do Supabase (REAL); false = ainda sem consulta (EXEMPLO) */
  real: boolean
  dataConsulta: string
  memoriaisPorMes: { mes: string; total: number }[]
  memoriaisPorMesOrigem: { mes: string; Nossos: number; Parceiros: number }[]
  memoriaisPorOrigem: {
    mapaCemiterio: number
    central: number
    parceiroPortal: number
    familia: number
    semOrigem: number
    deParceiros: number
  }
  parceiros: { id: string; nome: string; plano: string; status: string; pct: number; criadaEm: string; memoriais: number }[]
  totalMemoriais: number
}

type Estado = {
  ajuda: boolean
  setAjuda: (v: boolean) => void
  modo: Modo
  setModo: (m: Modo) => void
  tema: Tema
  setTema: (t: Tema) => void
  simulacao: boolean
  setSimulacao: (v: boolean) => void
  custos: Custo[]
  setCustos: (c: Custo[]) => void
  K: number
  introVisto: boolean
  marcarIntroVisto: () => void
  origem: Origem
  setOrigem: (o: Origem) => void
  dados: DadosTela
  estadoDados: "carregando" | "ok" | "erro"
  mensagemErro: string
}

export function lerLocal(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave)
  } catch {
    return null
  }
}
export function gravarLocal(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor)
  } catch {
    /* sem armazenamento: segue sem guardar */
  }
}

const dformat = (iso: string) => {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  const d = new Date(t - 3 * 3600 * 1000)
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`
}

/** Exemplo (EXEMPLO) usado enquanto não há consulta real. */
const dadosExemplo: DadosTela = {
  real: false,
  dataConsulta: DATA_SNAPSHOT,
  memoriaisPorMes: snapMes,
  memoriaisPorMesOrigem: snapMesOrigem,
  memoriaisPorOrigem: { ...snapOrigem, parceiroPortal: 0, familia: 0 },
  parceiros: snapParceiros.map((p, i) => ({ id: `ex-${i}`, ...p, memoriais: 0 })),
  totalMemoriais: snapMes.reduce((t, m) => t + m.total, 0),
}

export function dadosDaApi(d: DadosFinanceiros, pctPadrao: number): DadosTela {
  return {
    real: true,
    dataConsulta: dformat(d.consultadoEm),
    memoriaisPorMes: d.memoriaisPorMes,
    memoriaisPorMesOrigem: d.memoriaisPorMesOrigem,
    memoriaisPorOrigem: d.memoriaisPorOrigem,
    parceiros: d.parceiros.map((p) => ({ ...p, pct: pctPadrao })),
    totalMemoriais: d.totalMemoriais,
  }
}

const Ctx = React.createContext<Estado | null>(null)

export function EstadoProvider({
  children,
  dadosApi,
  estadoDados = "ok",
  mensagemErro = "",
  pctPadrao = 0.3,
}: {
  children: React.ReactNode
  dadosApi?: DadosFinanceiros | null
  estadoDados?: "carregando" | "ok" | "erro"
  mensagemErro?: string
  pctPadrao?: number
}) {
  const [ajuda, setAjudaS] = React.useState(false)
  const [modo, setModoS] = React.useState<Modo>("detalhado")
  const [tema, setTemaS] = React.useState<Tema>("claro")
  const [simulacao, setSimulacao] = React.useState(false)
  const [custos, setCustos] = React.useState<Custo[]>(custosIniciais)
  const [introVisto, setIntroVisto] = React.useState(true)
  const [origem, setOrigem] = React.useState<Origem>("Todos")

  React.useEffect(() => {
    setAjudaS(lerLocal("ldf_ajuda") === "1")
    const m = lerLocal("ldf_modo")
    if (m === "simples" || m === "detalhado") setModoS(m)
    setIntroVisto(lerLocal("ldf_intro") === "1")
    const t = lerLocal("ldf_tema")
    if (t === "claro" || t === "escuro") setTemaS(t)
  }, [])

  const setAjuda = (v: boolean) => {
    setAjudaS(v)
    gravarLocal("ldf_ajuda", v ? "1" : "0")
  }
  const setModo = (m: Modo) => {
    setModoS(m)
    gravarLocal("ldf_modo", m)
  }
  const setTema = (t: Tema) => {
    setTemaS(t)
    gravarLocal("ldf_tema", t)
  }
  const marcarIntroVisto = () => {
    setIntroVisto(true)
    gravarLocal("ldf_intro", "1")
  }
  const K = custos.reduce((t, c) => t + c.valor, 0)
  const dados = React.useMemo(() => (dadosApi ? dadosDaApi(dadosApi, pctPadrao) : dadosExemplo), [dadosApi, pctPadrao])

  return (
    <Ctx.Provider
      value={{
        ajuda, setAjuda, modo, setModo, tema, setTema, simulacao, setSimulacao, custos, setCustos, K,
        introVisto, marcarIntroVisto, origem, setOrigem, dados, estadoDados, mensagemErro,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useEstado() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("EstadoProvider ausente")
  return c
}

/** Dados de memoriais/parceiros com os mesmos nomes que as telas já usavam. */
export function useDadosReais() {
  const { dados } = useEstado()
  return {
    ...dados,
    TOTAL_MEMORIAIS: dados.totalMemoriais,
    DATA_SNAPSHOT: dados.dataConsulta,
  }
}
