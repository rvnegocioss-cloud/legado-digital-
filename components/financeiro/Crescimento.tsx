"use client"

import { AreaChart, type TooltipProps } from "@/components/financeiro/ui/AreaChart"
import { BarChart } from "@/components/financeiro/ui/BarChart"

import { useDadosReais, useEstado } from "@/lib/financeiro/estado"
import { novosPorMesSimulados, serie, variacaoPct } from "@/lib/financeiro/financeiro"
import { brl, inteiro, pct } from "@/lib/financeiro/formato"
import { teto } from "@/lib/financeiro/graficos"
import { useOrigem } from "@/lib/financeiro/origem"
import { SIM } from "@/lib/financeiro/padroes"
import type { Fonte } from "@/lib/financeiro/tipos"
import { linhaHorizontal, pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, SoDetalhado } from "./Blocos"

// Balão do gráfico de receita: mostra o valor e a variação em relação ao mês anterior.
function BalaoVariacao({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null
  const linha = payload[0].payload as { variacao: number | null }
  const v = linha.variacao
  return (
    <div className="rounded-md border border-gray-200 bg-white text-sm shadow-md">
      <div className="border-b border-gray-200 px-4 py-2 font-medium text-[var(--tinta)]">{label}</div>
      <div className="space-y-1 px-4 py-2 text-gray-800">
        <div className="flex justify-between gap-8">
          <span>Receita nossa</span>
          <span className="font-medium text-[var(--tinta)]">{brl(payload[0].value)}</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>Mudança sobre o mês anterior</span>
          <span className="font-medium text-[var(--tinta)]">
            {v == null ? "—" : `${v > 0 ? "+" : ""}${pct(v)}`}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Crescimento() {
  const { memoriaisPorMesOrigem, TOTAL_MEMORIAIS, dataConsulta } = useDadosReais()
  const totNossos = memoriaisPorMesOrigem.reduce((t, m) => t + m.Nossos, 0)
  const totParc = memoriaisPorMesOrigem.reduce((t, m) => t + m.Parceiros, 0)
  const { K, simulacao, ajuda } = useEstado()
  const [origem] = useOrigem()
  const fonte: Fonte = simulacao ? "SIMULAÇÃO" : "REAL"

  const novos = simulacao ? novosPorMesSimulados(SIM.sn, SIM.spn) : memoriaisPorMesOrigem
  const receitas = simulacao
    ? serie({ origem, simulacao: true, K, p: SIM.p, pct: SIM.pct, sn: SIM.sn, spn: SIM.spn }).map((d) => ({
        mes: d.mes,
        valor: d.receita,
      }))
    : memoriaisPorMesOrigem.map((m) => ({ mes: m.mes, valor: 0 }))
  const dadosReceita = receitas.map((r, i) => ({
    mes: r.mes,
    "Receita nossa": r.valor,
    variacao: i === 0 ? null : variacaoPct(r.valor, receitas[i - 1].valor),
  }))

  const categoriasNovos = origem === "Nossos" ? ["Nossos"] : origem === "Parceiros" ? ["Parceiros"] : ["Nossos", "Parceiros"]
  const coresNovos = categoriasNovos.map((c) => (c === "Nossos" ? ("blue" as const) : ("cyan" as const)))

  const totN = novos.reduce((t, m) => t + m.Nossos, 0)
  const totP = novos.reduce((t, m) => t + m.Parceiros, 0)
  const partP = totN + totP === 0 ? 0 : totP / (totN + totP)

  const maxNovos = Math.max(...novos.map((m) => m.Nossos + m.Parceiros), 1)
  const maxReceita = Math.max(...dadosReceita.map((d) => d["Receita nossa"]), 0)
  const ultimaRec = dadosReceita[dadosReceita.length - 1]["Receita nossa"]
  const primeiraRec = dadosReceita[0]["Receita nossa"]
  const varTotal = variacaoPct(ultimaRec, primeiraRec)

  const overlayNovos = ajuda
    ? pontoSolto({
        chave: "no",
        x: novos[Math.min(2, novos.length - 1)].mes,
        y: maxNovos * 1.1,
        texto: "Cada barra é um mês. A parte dourada são memoriais criados por nós; a azul, os criados por parceiros.",
      })
    : undefined
  const overlayReceita = ajuda
    ? linhaHorizontal({
        chave: "cr0",
        y: 0,
        xPonto: dadosReceita[dadosReceita.length - 1].mes,
        dy: -18,
        texto: "R$ 0: sem receita. Passe o mouse no gráfico para ver a mudança de cada mês sobre o anterior.",
      })
    : undefined

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Crescimento</h1>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte id="cr-novos" fonte={fonte} titulo="Memoriais novos por mês">
          <Frase>
            {simulacao
              ? `Na simulação, em 12 meses entram ${inteiro(totN)} memoriais nossos e ${inteiro(totP)} de parceiros.`
              : `Até ${dataConsulta} foram criados ${inteiro(TOTAL_MEMORIAIS)} memoriais: ${inteiro(totNossos)} nossos e ${inteiro(totParc)} de parceiros.`}
          </Frase>
          <SoDetalhado>
            <BarChart
              className="h-full"
              data={novos}
              index="mes"
              categories={categoriasNovos}
              colors={coresNovos}
              type="stacked"
              valueFormatter={(v) => inteiro(v)}
              allowDecimals={false}
              yAxisWidth={40}
              minValue={0}
              maxValue={teto(maxNovos * 1.1)}
              overlay={overlayNovos}
            />
          </SoDetalhado>
        </CartaoFonte>

        <CartaoFonte
          id="cr-participacao"
          fonte={fonte}
          titulo={
            <Termo explica="Mostra, de cada 100 memoriais novos do mês, quantos vieram de nós e quantos de parceiros.">
              Quem traz os memoriais: nós ou parceiros
            </Termo>
          }
        >
          <Frase>
            {totP === 0
              ? "Os parceiros trouxeram 0% dos memoriais até agora: todos vieram de nós."
              : `Os parceiros trazem ${pct(partP)} dos memoriais da simulação.`}
          </Frase>
          <SoDetalhado>
            <BarChart
              className="h-full"
              data={novos}
              index="mes"
              categories={["Nossos", "Parceiros"]}
              colors={["blue", "cyan"]}
              type="percent"
              valueFormatter={(v) => inteiro(v)}
              yAxisWidth={48}
            />
          </SoDetalhado>
        </CartaoFonte>
      </div>

      <CartaoFonte id="cr-receita" fonte={simulacao ? "SIMULAÇÃO" : "INFORMADO"} className="flex-1" titulo="Dinheiro nosso que entra, mês a mês">
        <Frase>
          {simulacao
            ? `Na simulação, a receita nossa vai de ${brl(primeiraRec)} para ${brl(ultimaRec)} por mês${varTotal == null ? "" : ` (${varTotal > 0 ? "+" : ""}${pct(varTotal)})`}. A receita real continua ${brl(0)}.`
            : "A receita real é R$ 0,00 em todos os meses: nenhum memorial paga ainda."}
        </Frase>
        <SoDetalhado>
          <AreaChart
            className="h-full"
            data={dadosReceita}
            index="mes"
            categories={["Receita nossa"]}
            colors={["blue"]}
            valueFormatter={(v) => brl(v, 0)}
            showLegend={false}
            yAxisWidth={84}
            minValue={0}
            maxValue={teto(maxReceita * 1.2)}
            customTooltip={BalaoVariacao}
            overlay={overlayReceita}
          />
        </SoDetalhado>
      </CartaoFonte>
    </div>
  )
}
