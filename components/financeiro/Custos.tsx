"use client"

import React from "react"

import { BarChart } from "@/components/financeiro/ui/BarChart"
import { Button } from "@/components/financeiro/ui/Button"
import { Input } from "@/components/financeiro/ui/Input"

import { custosIniciais } from "@/lib/financeiro/padroes"
import { useEstado } from "@/lib/financeiro/estado"
import { brl, pct } from "@/lib/financeiro/formato"
import { teto } from "@/lib/financeiro/graficos"
import { linhaHorizontal, pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, SoDetalhado } from "./Blocos"
import { DonutChart } from "./DonutChart"

export function Custos() {
  const { custos, setCustos, K, ajuda } = useEstado()
  const [versao, setVersao] = React.useState(0)

  const maior = custos.reduce((a, c) => (c.valor > a.valor ? c : a), custos[0])
  const dadosBarras = custos.map((c) => ({ nome: c.nome, "Valor por mês": c.valor }))
  const ultimoNome = custos[custos.length - 1].nome

  const overlay = ajuda
    ? [
        ...linhaHorizontal({
          chave: "ck",
          y: K,
          xPonto: ultimoNome,
          dy: -18,
          texto: `${brl(K)}: o que precisamos cobrir por mês (soma de todas as contas).`,
        }),
        ...pontoSolto({
          chave: "co",
          x: maior.nome,
          y: maior.valor * 1.12,
          texto: "A barra mais alta é a conta mais pesada do mês.",
        }),
      ]
    : undefined

  function mudar(i: number, bruto: string) {
    const n = parseFloat(bruto.replace(",", "."))
    const valor = Number.isFinite(n) && n > 0 ? n : 0
    setCustos(custos.map((c, j) => (j === i ? { ...c, valor } : c)))
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Custos</h1>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte
          id="cu-rosca"
          titulo={
            <Termo explica="Custo fixo é a conta que chega todo mês, venda ou não.">
              Para onde vai o dinheiro todo mês
            </Termo>
          }
          fonte="INFORMADO"
        >
          <Frase>
            Hoje saem {brl(K)} por mês em {custos.length} contas. A maior é {maior.nome}, com{" "}
            {pct(K > 0 ? maior.valor / K : 0)} do total.
          </Frase>
          <SoDetalhado>
            <DonutChart
              dados={custos.map((c) => ({ nome: c.nome, valor: c.valor }))}
            />
          </SoDetalhado>
        </CartaoFonte>

        <CartaoFonte id="cu-barras" titulo="Quanto custa cada item por mês" fonte="INFORMADO">
          <Frase>
            O {maior.nome} custa {brl(maior.valor)} por mês, mais que as outras contas. Juntas, as
            três somam {brl(K)}.
          </Frase>
          <SoDetalhado>
            <BarChart
              className="h-full"
              data={dadosBarras}
              index="nome"
              categories={["Valor por mês"]}
              colors={["blue"]}
              valueFormatter={(v) => brl(v)}
              showLegend={false}
              yAxisWidth={84}
              minValue={0}
              maxValue={teto(K * 1.2)}
              overlay={overlay}
            />
          </SoDetalhado>
        </CartaoFonte>
      </div>

      <CartaoFonte id="cu-editar" titulo="Ajuste os valores das contas" fonte="INFORMADO">
        <p className="mt-2 text-base text-gray-700">
          Mude um valor e o painel inteiro se atualiza na hora.
        </p>
        <div key={versao} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {custos.map((c, i) => (
            <div key={c.nome}>
              <label htmlFor={`custo-${i}`} className="text-sm">
                {c.nome} (R$ por mês)
              </label>
              <Input
                id={`custo-${i}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                defaultValue={c.valor}
                onChange={(e) => mudar(i, e.target.value)}
                className="mt-1"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
          <p className="text-lg font-semibold text-[var(--tinta)]">Total por mês: {brl(K)}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setCustos(custosIniciais)
              setVersao(versao + 1)
            }}
          >
            Voltar aos valores informados
          </Button>
        </div>
      </CartaoFonte>
    </div>
  )
}
