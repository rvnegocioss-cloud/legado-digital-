"use client"

import { BarChart } from "@/components/financeiro/ui/BarChart"
import { BarList } from "@/components/financeiro/ui/BarList"
import { Badge } from "@/components/financeiro/ui/Badge"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/financeiro/ui/Table"

import { useDadosReais, useEstado } from "@/lib/financeiro/estado"
import { inteiro } from "@/lib/financeiro/formato"
import { teto } from "@/lib/financeiro/graficos"
import { useOrigem } from "@/lib/financeiro/origem"
import { pontoSolto, Termo } from "./Ajuda"
import { CartaoFonte, Frase, SoDetalhado, Valor } from "./Blocos"
import { DonutChart } from "./DonutChart"

export function Memoriais() {
  const { DATA_SNAPSHOT, memoriaisPorMes, memoriaisPorMesOrigem, memoriaisPorOrigem, parceiros, TOTAL_MEMORIAIS } = useDadosReais()
  const { ajuda } = useEstado()
  const [origem] = useOrigem()

  const nossos = origem !== "Parceiros"
  const deParceiros = origem !== "Nossos"
  const totalNossos = TOTAL_MEMORIAIS - memoriaisPorOrigem.deParceiros
  const total = (nossos ? totalNossos : 0) + (deParceiros ? memoriaisPorOrigem.deParceiros : 0)
  const mesMeio = memoriaisPorMesOrigem[Math.floor(memoriaisPorMesOrigem.length / 2)]?.mes ?? ""

  const categorias = origem === "Nossos" ? ["Nossos"] : origem === "Parceiros" ? ["Parceiros"] : ["Nossos", "Parceiros"]
  const cores = categorias.map((c) => (c === "Nossos" ? ("blue" as const) : ("cyan" as const)))
  const maxMes = Math.max(...memoriaisPorMesOrigem.map((m) => m.Nossos + m.Parceiros), 1)

  const fatias = nossos
    ? [
        { nome: "Mapa do cemitério", valor: memoriaisPorOrigem.mapaCemiterio },
        { nome: "Central", valor: memoriaisPorOrigem.central },
        { nome: "Portal do parceiro", valor: memoriaisPorOrigem.parceiroPortal },
        { nome: "Portal da família", valor: memoriaisPorOrigem.familia },
        { nome: "Sem origem registrada", valor: memoriaisPorOrigem.semOrigem },
      ]
    : []

  const porParceiro = [
    ...(nossos ? [{ name: "Sem parceiro (nossos)", value: totalNossos }] : []),
    ...parceiros.map((p) => ({ name: p.nome, value: p.memoriais })),
  ]

  const overlay = ajuda
    ? pontoSolto({
        chave: "mo",
        x: mesMeio,
        y: maxMes * 1.15,
        texto: `Cada barra é um mês. O mês atual ainda não terminou (dados até ${DATA_SNAPSHOT}).`,
      })
    : undefined

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Memoriais</h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CartaoFonte kpi id="me-total" fonte="REAL" titulo="Memoriais criados">
          <Valor sub={`Consulta ao Supabase em ${DATA_SNAPSHOT}`}>{inteiro(total)}</Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="me-parceiros" fonte="REAL" titulo="Parceiros cadastrados">
          <Valor sub={parceiros.map((p) => p.nome).join(" e ") || "Nenhum cadastrado"}>{inteiro(parceiros.length)}</Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="me-deparceiros" fonte="REAL" titulo="Memoriais criados por parceiros">
          <Valor sub={memoriaisPorOrigem.deParceiros === 0 ? "Nenhum memorial ligado a parceiro ainda" : "Memoriais ligados a algum parceiro"}>{inteiro(memoriaisPorOrigem.deParceiros)}</Valor>
        </CartaoFonte>
        <CartaoFonte kpi id="me-semorigem" fonte="REAL" titulo="Memoriais sem origem registrada">
          <Valor
            sub={
              <Termo explica="Origem é por onde o memorial foi criado: pelo mapa do cemitério ou pela central. Em alguns memoriais antigos esse dado não foi guardado.">
                Não sabemos por onde foram criados
              </Termo>
            }
          >
            {inteiro(nossos ? memoriaisPorOrigem.semOrigem : 0)}
          </Valor>
        </CartaoFonte>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte id="me-meses" fonte="REAL" titulo="Memoriais novos por mês">
          <Frase>{memoriaisPorMes.map((m) => `${m.mes} ${m.total}`).join(", ")}. Dados até {DATA_SNAPSHOT}.</Frase>
          <SoDetalhado>
            <BarChart
              className="h-full"
              data={memoriaisPorMesOrigem}
              index="mes"
              categories={categorias}
              colors={cores}
              type="stacked"
              valueFormatter={(v) => inteiro(v)}
              allowDecimals={false}
              yAxisWidth={40}
              minValue={0}
              maxValue={teto(maxMes * 1.1)}
              overlay={overlay}
            />
          </SoDetalhado>
        </CartaoFonte>

        <CartaoFonte id="me-origem" fonte="REAL" titulo="Por onde os memoriais foram criados">
          <Frase>
            {nossos
              ? `Mapa do cemitério ${memoriaisPorOrigem.mapaCemiterio}, central ${memoriaisPorOrigem.central}, portais ${memoriaisPorOrigem.parceiroPortal + memoriaisPorOrigem.familia} e ${memoriaisPorOrigem.semOrigem} sem origem registrada, num total de ${TOTAL_MEMORIAIS}.`
              : "Nenhum memorial de parceiro até agora, então não há origem para mostrar."}
          </Frase>
          <SoDetalhado>
            {fatias.length > 0 ? (
              <DonutChart dados={fatias} rotuloTotal="Memoriais" formato={(v) => inteiro(v)} />
            ) : (
              <p className="m-auto text-base text-gray-600">Sem dados para esta origem.</p>
            )}
          </SoDetalhado>
        </CartaoFonte>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_3fr]">
        <CartaoFonte id="me-porparceiro" fonte="REAL" titulo="Memoriais de cada parceiro">
          <Frase>{memoriaisPorOrigem.deParceiros === 0 ? `Nenhum parceiro tem memorial por enquanto. Os ${TOTAL_MEMORIAIS} são todos nossos.` : `${memoriaisPorOrigem.deParceiros} memoriais estão ligados a parceiros; ${totalNossos} são nossos.`}</Frase>
          <div className="mt-4">
            <BarList data={porParceiro} valueFormatter={(v) => inteiro(v)} sortOrder="none" />
          </div>
        </CartaoFonte>

        <CartaoFonte id="me-tabela" fonte="REAL" titulo="Parceiros cadastrados">
          <TableRoot className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Parceiro</TableHeaderCell>
                  <TableHeaderCell>Plano</TableHeaderCell>
                  <TableHeaderCell>Pagamento</TableHeaderCell>
                  <TableHeaderCell>Criada em</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parceiros.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium text-[var(--tinta)]">{p.nome}</TableCell>
                    <TableCell>{p.plano}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{p.status === "—" ? "Não configurado" : p.status}</Badge>
                    </TableCell>
                    <TableCell>{p.criadaEm}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRoot>
        </CartaoFonte>
      </div>
    </div>
  )
}
