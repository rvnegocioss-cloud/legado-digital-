"use client"

import { BarChart } from "@/components/financeiro/ui/BarChart"
import { BarList } from "@/components/financeiro/ui/BarList"
import { useEstado } from "@/lib/financeiro/estado"
import { divisaoPorMemorial, LIQ, LIQP, margem, serie } from "@/lib/financeiro/financeiro"
import { brl } from "@/lib/financeiro/formato"
import { useOrigem } from "@/lib/financeiro/origem"
import { SIM } from "@/lib/financeiro/padroes"
import { linhaHorizontal, pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, SoDetalhado } from "./Blocos"

const PRECOS = [SIM.p, 9.99]

const pct1 = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v) + "%"

export function Rentabilidade() {
  const { K, simulacao, ajuda } = useEstado()
  const [origem] = useOrigem()

  const mostraNossos = origem !== "Parceiros"
  const mostraParceiros = origem !== "Nossos"

  const dados = PRECOS.flatMap((p) => [
    ...(mostraNossos
      ? [{ nome: `Memorial nosso a ${brl(p)}`, ...cat(divisaoPorMemorial(p, SIM.pct, "Nossos")) }]
      : []),
    ...(mostraParceiros
      ? [{ nome: `Memorial de parceiro a ${brl(p)}`, ...cat(divisaoPorMemorial(p, SIM.pct, "Parceiros")) }]
      : []),
  ])

  const margens = [
    ...(mostraNossos
      ? [{ name: `Nossos: ficam ${brl(LIQ(SIM.p))} de ${brl(SIM.p)}`, value: margem(SIM.p, SIM.pct, "Nossos") * 100 }]
      : []),
    ...(mostraParceiros
      ? [
          {
            name: `Parceiros: ficam ${brl(LIQP(SIM.p, SIM.pct))} de ${brl(SIM.p)}`,
            value: margem(SIM.p, SIM.pct, "Parceiros") * 100,
          },
        ]
      : []),
  ]

  const ultimo = (o: "Nossos" | "Parceiros") =>
    serie({ origem: o, simulacao, K, p: SIM.p, pct: SIM.pct, sn: SIM.sn, spn: SIM.spn })[11].receita
  const receitas = [
    ...(mostraNossos ? [{ name: "Nossos (cadastrados por nós)", value: ultimo("Nossos") }] : []),
    ...(mostraParceiros ? [{ name: "Parceiros (cadastrados por parceiros)", value: ultimo("Parceiros") }] : []),
  ]

  const maxY = 12
  const overlay = ajuda
    ? [
        ...linhaHorizontal({
          chave: "rt",
          y: SIM.p,
          xPonto: dados[dados.length - 1].nome,
          dy: -18,
          texto: `${brl(SIM.p)}: o que o cliente paga por mês no plano mensal. Daqui saem a parte do parceiro, o imposto e a taxa.`,
        }),
        ...pontoSolto({
          chave: "ro",
          x: dados[0].nome,
          y: maxY * 0.75,
          texto: "A barra dourada é o que sobra para nós depois de parceiro, imposto de 6% e taxa do Asaas.",
        }),
      ]
    : undefined

  const dPar = divisaoPorMemorial(SIM.p, SIM.pct, "Parceiros")
  const fraseGrafico =
    origem === "Parceiros"
      ? `Em um memorial de parceiro de ${brl(SIM.p)}, o parceiro fica com ${brl(dPar.parteParceiro)} e sobram ${brl(dPar.nossaParte)} para nós.`
      : origem === "Nossos"
        ? `Em um memorial nosso de ${brl(SIM.p)}, sobram ${brl(LIQ(SIM.p))} para nós depois do imposto e da taxa.`
        : `Em um memorial nosso de ${brl(SIM.p)} sobram ${brl(LIQ(SIM.p))}. Se for de parceiro, ele leva ${brl(dPar.parteParceiro)} e sobram ${brl(dPar.nossaParte)}.`

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Rentabilidade</h1>

      <CartaoFonte
        id="re-grafico"
        fonte="CALCULADO"
        className="flex-1"
        titulo={
          <Termo explica="Rentabilidade é quanto sobra para nós de cada memorial, depois de pagar o parceiro, o imposto de 6% e a taxa do Asaas.">
            De cada memorial, quanto fica para nós
          </Termo>
        }
      >
        <Frase>{fraseGrafico}</Frase>
        <SoDetalhado>
          <BarChart
            className="h-full"
            data={dados}
            index="nome"
            categories={["Cobrado do cliente", "Parte do parceiro", "Nossa parte líquida"]}
            colors={["sky", "violet", "blue"]}
            valueFormatter={(v) => brl(v)}
            yAxisWidth={84}
            minValue={0}
            maxValue={maxY}
            overlay={overlay}
          />
        </SoDetalhado>
      </CartaoFonte>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte id="re-margem" fonte="CALCULADO" titulo="Margem: quanto de cada R$ 100 cobrados fica para nós">
          <Frase>
            {mostraParceiros && mostraNossos
              ? `Memorial nosso deixa ${pct1(margem(SIM.p, SIM.pct, "Nossos") * 100)}; o de parceiro deixa ${pct1(margem(SIM.p, SIM.pct, "Parceiros") * 100)}.`
              : `Margem do plano de ${brl(SIM.p)}: ${pct1(margens[0].value)} fica para nós.`}
          </Frase>
          <div className="mt-4">
            <BarList data={margens} valueFormatter={pct1} sortOrder="none" />
          </div>
        </CartaoFonte>
        <CartaoFonte
          id="re-receita"
          fonte={simulacao ? "SIMULAÇÃO" : "INFORMADO"}
          titulo="Dinheiro que cada origem traz por mês"
        >
          <Frase>
            {simulacao
              ? "Na simulação, em 12 meses cada origem traz os valores abaixo. Receita real hoje: R$ 0,00."
              : "Hoje nenhuma origem traz dinheiro: a receita real é R$ 0,00."}
          </Frase>
          <div className="mt-4">
            <BarList data={receitas} valueFormatter={(v) => brl(v)} sortOrder="none" />
          </div>
        </CartaoFonte>
      </div>
    </div>
  )
}

function cat(d: ReturnType<typeof divisaoPorMemorial>) {
  return {
    "Cobrado do cliente": d.cobrado,
    "Parte do parceiro": d.parteParceiro,
    "Nossa parte líquida": d.nossaParte,
  }
}
