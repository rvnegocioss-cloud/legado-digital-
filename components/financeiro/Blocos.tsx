"use client"

import React from "react"

import { Badge } from "@/components/financeiro/ui/Badge"
import { Card } from "@/components/financeiro/ui/Card"
import { useEstado } from "@/lib/financeiro/estado"
import type { Fonte } from "@/lib/financeiro/tipos"
import { cx } from "@/components/financeiro/ui/utils"
import { EtiquetaFonte } from "./EtiquetaFonte"

// Todo cartão do painel passa por aqui: a etiqueta de fonte é obrigatória.
export function CartaoFonte({
  id,
  titulo,
  fonte,
  children,
  className,
  kpi,
  real,
}: {
  id: string
  titulo: React.ReactNode
  fonte: Fonte
  children?: React.ReactNode
  className?: string
  /** cartão estreito de número: etiqueta em cima, título embaixo */
  kpi?: boolean
  /** força a origem dos dados (portal do parceiro); padrão = veio da API da Central */
  real?: boolean
}) {
  return (
    <Card data-cartao={id} className={cx("flex h-full flex-col p-5", className)}>
      <header
        className={cx(
          kpi ? "flex flex-col items-start gap-2" : "flex items-start justify-between gap-3",
        )}
      >
        {kpi ? <EtiquetaFonte fonte={fonte} real={real} /> : null}
        <h2 className={cx("text-base font-semibold text-[var(--tinta)]", kpi && "min-h-[3rem]")}>{titulo}</h2>
        {kpi ? null : <EtiquetaFonte fonte={fonte} real={real} />}
      </header>
      {children}
    </Card>
  )
}

export function Frase({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-md border-l-4 border-[var(--ldb-500)] bg-[var(--ldb-50)] px-3 py-2 text-base font-medium text-[var(--tinta)]">
      {children}
    </p>
  )
}

// Número grande de um cartão (KPI), com legenda curta embaixo.
export function Valor({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mt-auto pt-3">
      <p className="text-3xl font-semibold text-[var(--tinta)]">{children}</p>
      {sub ? <p className="mt-1 text-sm text-gray-600">{sub}</p> : null}
    </div>
  )
}

// Gráfico só aparece no modo Detalhado.
export function SoDetalhado({ children }: { children: React.ReactNode }) {
  const { modo } = useEstado()
  return modo === "detalhado" ? <div className="mt-4 flex min-h-[14rem] flex-1 flex-col">{children}</div> : null
}

export type Cor = "No azul" | "Atenção" | "No vermelho"

export function semaforoDe(receita: number, custo: number): Cor {
  if (receita >= custo) return "No azul"
  if (receita >= custo * 0.7) return "Atenção"
  return "No vermelho"
}

export function Semaforo({ cor }: { cor: Cor }) {
  const v = cor === "No azul" ? "success" : cor === "Atenção" ? "warning" : "error"
  const bola =
    cor === "No azul" ? "bg-emerald-500" : cor === "Atenção" ? "bg-orange-500" : "bg-rose-500"
  return (
    <Badge variant={v} className="text-sm font-semibold">
      <span className={`size-2.5 rounded-full ${bola}`} aria-hidden="true" />
      {cor}
    </Badge>
  )
}
