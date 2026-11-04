"use client"

import { ReferenceDot, ReferenceLine } from "recharts"

import { LineChart } from "@/components/financeiro/ui/LineChart"
import { ProgressCircle } from "@/components/financeiro/ui/ProgressCircle"
import { useEstado } from "@/lib/financeiro/estado"
import { EQ, EQP, LIQ, LIQP, serie, serieEquilibrio } from "@/lib/financeiro/financeiro"
import { brl, inteiro, pct } from "@/lib/financeiro/formato"
import { teto } from "@/lib/financeiro/graficos"
import { useOrigem } from "@/lib/financeiro/origem"
import { RAZAO_PARCEIROS, SIM } from "@/lib/financeiro/padroes"
import { linhaHorizontal, pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, SoDetalhado, Valor } from "./Blocos"

export function Equilibrio() {
  const { K, simulacao, ajuda } = useEstado()
  const [origem] = useOrigem()

  const eq = EQ(SIM.p, K)
  const dados = serieEquilibrio({ p: SIM.p, pct: SIM.pct, K, razao: RAZAO_PARCEIROS })
  const nossosSim = serie({
    origem: "Nossos",
    simulacao: true,
    K,
    p: SIM.p,
    pct: SIM.pct,
    sn: SIM.sn,
    spn: SIM.spn,
  })[11].memoriais
  const pagantes = simulacao ? nossosSim : 0
  const percentual = Math.min(100, (pagantes / eq) * 100)
  const npExemplo = Math.round(eq * RAZAO_PARCEIROS)
  const eqComParceiros = EQP(SIM.p, npExemplo, SIM.pct, K)

  const categorias =
    origem === "Nossos"
      ? ["Custo fixo", "Receita nossa"]
      : origem === "Parceiros"
        ? ["Custo fixo", "Receita com parceiros (simulação)"]
        : ["Custo fixo", "Receita nossa", "Receita com parceiros (simulação)"]
  const cores = categorias.map((c) =>
    c === "Custo fixo" ? ("rose" as const) : c === "Receita nossa" ? ("blue" as const) : ("cyan" as const),
  )
  const maxY = teto(Math.max(K, ...dados.map((d) => d["Receita com parceiros (simulação)"])) * 1.15)
  const xEq = String(eq)

  const overlay = [
    <ReferenceDot
      key="eq-marca"
      x={xEq}
      y={K}
      r={8}
      fill="var(--cor-ouro)"
      stroke="var(--cor-linha)"
      strokeWidth={2}
      ifOverflow="extendDomain"
    />,
    <ReferenceLine
      key="eq-linha"
      x={xEq}
      stroke="var(--cor-ouro)"
      strokeWidth={2}
      strokeDasharray="2 4"
      label={{ value: `Equilíbrio: ${eq} memoriais`, position: "insideTopRight", fill: "var(--cor-linha)", fontSize: 14, fontWeight: 600 }}
    />,
    ...(ajuda
      ? [
          ...linhaHorizontal({
            chave: "ek",
            y: K,
            xPonto: dados[1].memoriais,
            dy: 20,
            cor: "var(--cor-alerta)",
            texto: `${brl(K)}: o que precisamos cobrir por mês. Onde a linha de receita cruza esta linha, as contas ficam pagas.`,
          }),
          ...pontoSolto({
            chave: "eo",
            x: dados[3].memoriais,
            y: maxY * 0.8,
            texto: "Quanto mais memoriais pagando, mais alta a linha de receita. A bolinha dourada é o ponto em que a receita iguala o custo.",
          }),
        ]
      : []),
  ]

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Equilíbrio</h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <CartaoFonte kpi id="eq-custo" fonte="INFORMADO" titulo="Custo fixo que precisa ser coberto">
          <Valor sub="Soma das contas por mês">{brl(K)}</Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="eq-liq" fonte="CALCULADO" titulo="Sobra de cada memorial nosso, por mês">
          <Valor
            sub={
              <Termo explica="Do plano de R$ 5,00 saem imposto de 6% e a taxa do Asaas (R$ 2,77 por ano). O que sobra é o líquido.">
                Líquido de um plano de {brl(SIM.p)}
              </Termo>
            }
          >
            {brl(LIQ(SIM.p))}
          </Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="eq-liqp" fonte="CALCULADO" titulo="Sobra de cada memorial de parceiro, por mês">
          <Valor sub={`Depois de o parceiro ficar com ${pct(SIM.pct)}`}>{brl(LIQP(SIM.p, SIM.pct))}</Valor>
        </CartaoFonte>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-3">
        <CartaoFonte
          id="eq-grafico"
          fonte="SIMULAÇÃO"
          className="xl:col-span-2"
          titulo={
            <Termo explica="Ponto de equilíbrio: quantos memoriais pagantes são necessários para a receita cobrir todo o custo do mês.">
              Quantos memoriais pagam as contas
            </Termo>
          }
        >
          <Frase>
            Precisamos de {inteiro(eq)} memoriais nossos pagando {brl(SIM.p)} por mês para cobrir {brl(K)}. Se
            houver {inteiro(npExemplo)} memoriais de parceiros (simulação), bastam {inteiro(eqComParceiros)} nossos.
          </Frase>
          <SoDetalhado>
            <LineChart
              className="h-full"
              data={dados}
              index="memoriais"
              categories={categorias}
              colors={cores}
              valueFormatter={(v) => brl(v, 0)}
              yAxisWidth={84}
              minValue={0}
              maxValue={maxY}
              xAxisLabel="Quantidade de memoriais nossos pagando"
              overlay={overlay}
            />
          </SoDetalhado>
        </CartaoFonte>

        <CartaoFonte id="eq-progresso" fonte="CALCULADO" titulo="Onde estamos hoje no caminho do equilíbrio">
          <Frase>
            {simulacao
              ? `Na simulação, em 12 meses chegamos a ${inteiro(pagantes)} de ${inteiro(eq)} memoriais. Real hoje: 0.`
              : `Hoje 0 memoriais pagam: faltam ${inteiro(eq)} para cobrir as contas.`}
          </Frase>
          <SoDetalhado>
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <ProgressCircle
                value={percentual}
                radius={110}
                strokeWidth={18}
                variant={percentual >= 100 ? "success" : percentual > 0 ? "warning" : "error"}
              >
                <div className="text-center">
                  <p className="text-3xl font-semibold text-[var(--tinta)]">
                    {inteiro(pagantes)} de {inteiro(eq)}
                  </p>
                  <p className="text-sm text-gray-600">memoriais pagando</p>
                </div>
              </ProgressCircle>
              <p className="text-base font-medium text-[var(--tinta)]">{pct(percentual / 100)} do caminho</p>
            </div>
          </SoDetalhado>
        </CartaoFonte>
      </div>
    </div>
  )
}
