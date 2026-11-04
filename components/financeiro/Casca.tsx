"use client"

import { CircleHelp, CirclePlay, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

import { Tooltip } from "@/components/financeiro/ui/Tooltip"
import { cx } from "@/components/financeiro/ui/utils"
import { useEstado } from "@/lib/financeiro/estado"
import { ORIGENS, useOrigem } from "@/lib/financeiro/origem"
import { Intro } from "./Intro"

export const ABAS = [
  { href: "/admin/financeiro", nome: "Visão geral" },
  { href: "/admin/financeiro/custos", nome: "Custos" },
  { href: "/admin/financeiro/equilibrio", nome: "Equilíbrio" },
  { href: "/admin/financeiro/rentabilidade", nome: "Rentabilidade" },
  { href: "/admin/financeiro/crescimento", nome: "Crescimento" },
  { href: "/admin/financeiro/memoriais", nome: "Memoriais" },
  { href: "/admin/financeiro/planos", nome: "Planos de pagamento" },
  { href: "/admin/financeiro/fontes", nome: "Fontes" },
] as const

const foco = "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ldb-500)]"

function Segmentos<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: readonly { v: T; nome: string }[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">{rotulo}</span>
      <div role="group" aria-label={rotulo} className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
        {opcoes.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={valor === o.v}
            onClick={() => onChange(o.v)}
            className={cx(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              foco,
              valor === o.v ? "bg-[var(--ldb-500)] text-[var(--ld-bg)]" : "text-gray-700 hover:bg-gray-100",
            )}
          >
            {o.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Casca({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { ajuda, setAjuda, modo, setModo, simulacao, setSimulacao, tema, setTema, dados, estadoDados, mensagemErro } = useEstado()
  const [origem, setOrigem] = useOrigem()

  return (
    <div className="ld-financeiro" data-ftema={tema}>
      <div className="ldf-conteudo">
        <header className="rounded-[var(--ld-raio-card)] border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
            <p className="ldf-marca text-base font-bold text-[var(--tinta)]">LEGADO FINANCEIRO</p>
            <Segmentos
              rotulo="Origem"
              opcoes={ORIGENS.map((o) => ({ v: o, nome: o }))}
              valor={origem}
              onChange={(v) => setOrigem(v)}
            />
            <Segmentos
              rotulo="Visual"
              opcoes={[
                { v: "simples", nome: "Simples" },
                { v: "detalhado", nome: "Detalhado" },
              ]}
              valor={modo}
              onChange={setModo}
            />
            <button
              type="button"
              aria-pressed={simulacao}
              onClick={() => setSimulacao(!simulacao)}
              className={cx(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold",
                foco,
                simulacao
                  ? "border-violet-700 bg-violet-700 text-white"
                  : "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100",
              )}
            >
              <CirclePlay className="size-4" aria-hidden="true" />
              Simulação: {simulacao ? "ligada" : "desligada"}
            </button>
            <button
              type="button"
              aria-pressed={tema === "escuro"}
              aria-label={`Tema: ${tema}. Clique para mudar para ${tema === "claro" ? "escuro" : "claro"}`}
              onClick={() => setTema(tema === "claro" ? "escuro" : "claro")}
              className={cx(
                "ml-auto inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-[var(--tinta)] hover:bg-gray-100",
                foco,
              )}
            >
              {tema === "claro" ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
              Tema: {tema}
            </button>
            <Tooltip
              content="Liga os pontos de interrogação ao lado dos termos difíceis. Com a Ajuda ligada, passe o mouse em cada ponto para ler a explicação em palavras simples."
              side="bottom"
              triggerAsChild
              collisionPadding={12}
            >
              <button
                type="button"
                aria-pressed={ajuda}
                onClick={() => setAjuda(!ajuda)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold",
                  foco,
                  ajuda
                    ? "border-[var(--ldb-500)] bg-[var(--ldb-500)] text-[var(--ld-bg)]"
                    : "border-gray-300 bg-white text-[var(--tinta)] hover:bg-gray-100",
                )}
              >
                <CircleHelp className="size-5" aria-hidden="true" />
                Ajuda
              </button>
            </Tooltip>
          </div>
          <nav aria-label="Telas do Legado Financeiro" className="flex flex-wrap gap-1 border-t border-gray-200 px-3 py-2">
            {ABAS.map((a) => {
              const ativo = a.href === "/admin/financeiro" ? pathname === a.href : pathname.startsWith(a.href)
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  aria-current={ativo ? "page" : undefined}
                  className={cx(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    foco,
                    ativo ? "bg-[var(--ldb-500)] text-[var(--ld-bg)]" : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  {a.nome}
                </Link>
              )
            })}
          </nav>
        </header>

        <p
          role="status"
          className={cx(
            "mt-3 rounded-md px-4 py-2 text-sm font-medium",
            estadoDados === "erro" ? "bg-rose-50 text-rose-900" : "bg-gray-100 text-gray-800",
          )}
          data-estado-dados={estadoDados}
        >
          {estadoDados === "carregando"
            ? "Consultando o Supabase (somente leitura)..."
            : estadoDados === "erro"
              ? `${mensagemErro} Enquanto isso os números de memoriais e parceiros abaixo são de EXEMPLO.`
              : `Memoriais e parceiros: REAL · Supabase · consulta em ${dados.dataConsulta}. Receita, custos, % do parceiro e preços: INFORMADO ou EXEMPLO (ainda não há pagamento ligado).`}
        </p>

        {simulacao ? (
          <div role="status" className="mt-3 rounded-md bg-violet-700 px-4 py-3 text-base font-semibold text-white">
            SIMULAÇÃO LIGADA: os números marcados SIMULAÇÃO são de mentira (cenário de crescimento). A receita real continua R$ 0,00.
          </div>
        ) : null}

        <main className="mt-5">{children}</main>
      </div>
      <Intro />
    </div>
  )
}
