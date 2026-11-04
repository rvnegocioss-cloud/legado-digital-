"use client"

import React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import { brl, pct } from "@/lib/financeiro/formato"

export const CORES_ROSCA = ["var(--cor-s1)", "var(--cor-s2)", "var(--cor-s3)", "var(--cor-s4)", "var(--cor-s5)"]

// Rosca simples. No centro aparece o total; ao passar o mouse numa fatia, o valor dela.
export function DonutChart({
  dados,
  rotuloTotal = "Total por mês",
  formato = brl,
}: {
  formato?: (v: number) => string
  dados: { nome: string; valor: number }[]
  rotuloTotal?: string
}) {
  const [ativo, setAtivo] = React.useState<number | null>(null)
  const total = dados.reduce((t, d) => t + d.valor, 0)
  const a = ativo != null ? dados[ativo] : null
  return (
    <div className="flex h-full flex-col">
      <div className="relative mx-auto min-h-64 w-full flex-1">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, i) => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
            >
              {dados.map((d, i) => (
                <Cell
                  key={d.nome}
                  fill={CORES_ROSCA[i % CORES_ROSCA.length]}
                  opacity={ativo == null || ativo === i ? 1 : 0.45}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          aria-live="polite"
        >
          <span className="text-sm text-gray-600">{a ? a.nome : rotuloTotal}</span>
          <span className="text-xl font-semibold text-[var(--tinta)]">
            {formato(a ? a.valor : total)}
          </span>
          {a && total > 0 ? (
            <span className="text-sm text-gray-600">{pct(a.valor / total)} do total</span>
          ) : null}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {dados.map((d, i) => (
          <li key={d.nome} className="flex items-center gap-2 text-sm text-gray-700">
            <span
              className="size-3 rounded-full"
              style={{ background: CORES_ROSCA[i % CORES_ROSCA.length] }}
              aria-hidden="true"
            />
            {d.nome}: {formato(d.valor)}
          </li>
        ))}
      </ul>
    </div>
  )
}
