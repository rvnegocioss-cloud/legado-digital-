"use client"

import React from "react"

import { AreaChart } from "@/components/financeiro/ui/AreaChart"
import { BarChart } from "@/components/financeiro/ui/BarChart"
import { RECEITA_REAL } from "@/lib/financeiro/padroes"
import { useDadosReais, useEstado } from "@/lib/financeiro/estado"
import { EQ, serie } from "@/lib/financeiro/financeiro"
import { brl, inteiro } from "@/lib/financeiro/formato"
import { limites } from "@/lib/financeiro/graficos"
import { useOrigem } from "@/lib/financeiro/origem"
import { SIM } from "@/lib/financeiro/padroes"
import type { Fonte } from "@/lib/financeiro/tipos"
import { linhaHorizontal, linhaVertical, pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, Semaforo, semaforoDe, SoDetalhado } from "./Blocos"

function Valor({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mt-auto pt-3">
      <p className="text-3xl font-semibold text-[var(--tinta)]">{children}</p>
      {sub ? <p className="mt-1 text-sm text-gray-600">{sub}</p> : null}
    </div>
  )
}

export function VisaoGeral() {
  const { memoriaisPorMes, memoriaisPorOrigem } = useDadosReais()
  const { K, simulacao, ajuda } = useEstado()
  const [origem] = useOrigem()

  const dados = serie({
    origem,
    simulacao,
    K,
    p: SIM.p,
    pct: SIM.pct,
    sn: SIM.sn,
    spn: SIM.spn,
  })
  const fonteGraf: Fonte = simulacao ? "SIMULAÇÃO" : "CALCULADO"
  const receitaMes = simulacao ? dados[dados.length - 1].receita : RECEITA_REAL
  const cor = semaforoDe(RECEITA_REAL, K)
  const totalMemoriais = memoriaisPorMes.reduce((t, m) => t + m.total, 0)
  const memoriaisOrigem = origem === "Parceiros" ? memoriaisPorOrigem.deParceiros : origem === "Nossos" ? totalMemoriais - memoriaisPorOrigem.deParceiros : totalMemoriais
  const faltam = EQ(SIM.p, K)

  const saldoFinal = dados[dados.length - 1].saldoAcum
  const mesesRuins = dados.filter((d) => d.resultado < 0).length

  // Faixas do gráfico (deixa folga acima do zero para as linhas de ajuda)
  const minSaldo = Math.min(...dados.map((d) => d.saldoAcum), 0)
  const limS = limites(minSaldo, 1)
  const folgaS = limS.max
  const minRes = Math.min(...dados.map((d) => d.resultado), 0)
  const limR = limites(minRes, 1.3)
  const folgaR = limR.max

  const dadosSaldo = dados.map((d) => ({ mes: d.mes, "Saldo acumulado": d.saldoAcum }))
  const dadosRes = dados.map((d) => ({
    mes: d.mes,
    Sobrou: Math.max(d.resultado, 0),
    Faltou: Math.min(d.resultado, 0),
  }))

  const ultimo = dados[dados.length - 1].mes

  const overlaySaldo = ajuda
    ? [
        ...linhaHorizontal({
          chave: "s0",
          y: 0,
          xPonto: ultimo,
          dy: -18,
          texto: "R$ 0: aqui empatamos. Acima desta linha sobra dinheiro; abaixo, falta.",
        }),
        ...linhaVertical({
          chave: "sh",
          x: dados[0].mes,
          yPonto: folgaS,
          dy: 18,
          texto: "Hoje (novembro). Daqui para a direita é previsão do futuro.",
        }),
        ...pontoSolto({
          chave: "so",
          x: dados[4].mes,
          y: folgaS * 0.45,
          texto: "Olhe a linha: quanto mais ela desce, mais dinheiro estamos perdendo no total.",
        }),
      ]
    : undefined

  const overlayRes = ajuda
    ? [
        ...linhaHorizontal({
          chave: "r0",
          y: 0,
          xPonto: ultimo,
          dy: -18,
          texto: "R$ 0: aqui empatamos. Barra para baixo = mês em que gastamos mais do que entrou.",
        }),
        ...linhaHorizontal({
          chave: "rk",
          y: -K,
          xPonto: ultimo,
          dy: 18,
          cor: "var(--cor-alerta)",
          texto: `${brl(K)}: o que precisamos cobrir por mês. Se não entrar nada, a barra chega até esta linha.`,
        }),
        ...linhaVertical({
          chave: "rh",
          x: dados[0].mes,
          yPonto: folgaR,
          dy: 18,
          texto: "Hoje (novembro). Daqui para a direita é previsão do futuro.",
        }),
        ...pontoSolto({
          chave: "ro",
          x: dados[4].mes,
          y: folgaR * 0.55,
          texto: "Cada barra vermelha = mês em que gastamos mais do que entrou.",
        }),
      ]
    : undefined

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Visão geral</h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CartaoFonte kpi id="vg-custo" titulo="Dinheiro que sai da nossa conta por mês" fonte="INFORMADO">
          <Valor sub={<Termo explica="Custo fixo é a conta que chega todo mês, venda ou não.">Custo fixo mensal</Termo>}>
            {brl(K)}
          </Valor>
        </CartaoFonte>
        <CartaoFonte
          kpi
          id="vg-receita"
          titulo="Dinheiro que entra por mês"
          fonte={simulacao ? "SIMULAÇÃO" : "INFORMADO"}
        >
          <Valor
            sub={
              simulacao
                ? `Simulado daqui a 12 meses. Receita real hoje: ${brl(RECEITA_REAL)}`
                : "Receita informada: ainda não há pagamento ligado ao sistema"
            }
          >
            {brl(receitaMes)}
          </Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="vg-memoriais" titulo="Memoriais criados" fonte="REAL">
          <Valor sub={origem === "Parceiros" ? "Memoriais ligados a algum parceiro" : "Todos os memoriais (nossos e de parceiros)"}>
            {inteiro(memoriaisOrigem)}
          </Valor>
        </CartaoFonte>
        <CartaoFonte
          kpi
          id="vg-equilibrio"
          titulo="Quantos memoriais precisamos para pagar as contas"
          fonte="CALCULADO"
        >
          <Valor
            sub={
              <Termo explica="Ponto de equilíbrio: quantos memoriais pagantes são necessários para a receita cobrir todo o custo do mês.">
                Ponto de equilíbrio (plano de {brl(SIM.p)})
              </Termo>
            }
          >
            {inteiro(faltam)}
          </Valor>
        </CartaoFonte>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <Semaforo cor={cor} />
        <p className="text-base font-medium text-[var(--tinta)]">
          Hoje saem {brl(K)} por mês e entram {brl(RECEITA_REAL)}.{" "}
          {RECEITA_REAL >= K ? "Estamos no azul." : "Estamos no prejuízo."}
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte
          id="vg-saldo"
          titulo={
            <Termo explica="Saldo acumulado é a soma de tudo que sobrou ou faltou desde o começo, mês após mês.">
              Quanto sobra ou falta de dinheiro, mês a mês
            </Termo>
          }
          fonte={fonteGraf}
        >
          <Frase>
            {simulacao
              ? `Na simulação, em 12 meses o caixa fica em ${brl(saldoFinal)}. Receita real continua ${brl(RECEITA_REAL)}.`
              : `Se nada mudar, em 12 meses teremos gasto ${brl(Math.abs(saldoFinal))} sem receber nada.`}
          </Frase>
          <SoDetalhado>
            <AreaChart
              className="h-full"
              data={dadosSaldo}
              index="mes"
              categories={["Saldo acumulado"]}
              colors={["blue"]}
              valueFormatter={(v) => brl(v, 0)}
              showLegend={false}
              yAxisWidth={92}
              minValue={limS.min}
              maxValue={folgaS}
              overlay={overlaySaldo}
            />
          </SoDetalhado>
        </CartaoFonte>

        <CartaoFonte
          id="vg-resultado"
          titulo="Mês bom ou mês ruim"
          fonte={fonteGraf}
        >
          <Frase>
            {mesesRuins === 12
              ? "Nos 12 meses seguintes, gastamos mais do que entra em todos. Cada barra vermelha é um mês no vermelho."
              : `Em ${mesesRuins} dos 12 meses seguintes, gastamos mais do que entra.`}
          </Frase>
          <SoDetalhado>
            <BarChart
              className="h-full"
              data={dadosRes}
              index="mes"
              categories={["Sobrou", "Faltou"]}
              colors={["emerald", "rose"]}
              type="stacked"
              valueFormatter={(v) => brl(v, 0)}
              yAxisWidth={92}
              minValue={limR.min}
              showLegend={false}
              maxValue={folgaR}
              overlay={overlayRes}
            />
          </SoDetalhado>
        </CartaoFonte>
      </div>
    </div>
  )
}
