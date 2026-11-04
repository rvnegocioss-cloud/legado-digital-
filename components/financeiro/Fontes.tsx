"use client"

import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/financeiro/ui/Table"
import { custosIniciais, PCT_PADRAO } from "@/lib/financeiro/padroes"
import { useDadosReais, useEstado } from "@/lib/financeiro/estado"
import { EQ, EQP, LIQ, LIQP, saldo } from "@/lib/financeiro/financeiro"
import { brl, inteiro, pct } from "@/lib/financeiro/formato"
import { SIM } from "@/lib/financeiro/padroes"
import type { Fonte } from "@/lib/financeiro/tipos"
import { CartaoFonte, Frase } from "./Blocos"
import { EtiquetaFonte } from "./EtiquetaFonte"

type Linha = { metrica: string; valor: string; fonte: Fonte; como: string; data: string }

function Tabela({ linhas }: { linhas: Linha[] }) {
  return (
    <TableRoot className="mt-4">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Métrica</TableHeaderCell>
            <TableHeaderCell>Valor atual</TableHeaderCell>
            <TableHeaderCell>Fonte</TableHeaderCell>
            <TableHeaderCell>Como foi calculado</TableHeaderCell>
            <TableHeaderCell>Data</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.metrica}>
              <TableCell className="font-medium text-[var(--tinta)]">{l.metrica}</TableCell>
              <TableCell className="font-medium text-[var(--tinta)]">{l.valor}</TableCell>
              <TableCell>
                <EtiquetaFonte fonte={l.fonte} />
              </TableCell>
              <TableCell>{l.como}</TableCell>
              <TableCell>{l.data}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRoot>
  )
}

export function Fontes() {
  const { DATA_SNAPSHOT, memoriaisPorMes, memoriaisPorOrigem, parceiros, TOTAL_MEMORIAIS } = useDadosReais()
  const { K, custos } = useEstado()
  const d = DATA_SNAPSHOT
  const eq = EQ(SIM.p, K)
  const np = Math.round(eq * (SIM.spn / SIM.sn))

  const reais: Linha[] = [
    { metrica: "Total de memoriais", valor: inteiro(TOTAL_MEMORIAIS), fonte: "REAL", como: "Contagem de linhas da tabela de memoriais no Supabase", data: d },
    {
      metrica: "Memoriais criados por mês",
      valor: memoriaisPorMes.map((m) => `${m.mes} ${m.total}`).join(" · "),
      fonte: "REAL",
      como: "Contagem agrupada pela data de criação. Novembro conta só até 04/11",
      data: d,
    },
    {
      metrica: "Memoriais por origem",
      valor: `Mapa ${memoriaisPorOrigem.mapaCemiterio} · Central ${memoriaisPorOrigem.central} · Sem origem ${memoriaisPorOrigem.semOrigem}`,
      fonte: "REAL",
      como: "Contagem pelo campo origem do cadastro; campo vazio vira sem origem",
      data: d,
    },
    { metrica: "Memoriais de parceiros", valor: inteiro(memoriaisPorOrigem.deParceiros), fonte: "REAL", como: "Contagem dos memoriais ligados a algum parceiro", data: d },
    {
      metrica: "Parceiros cadastrados",
      valor: `${parceiros.length}: ${parceiros.map((p) => `${p.nome} (${p.plano}, criada em ${p.criadaEm})`).join("; ")}`,
      fonte: "REAL",
      como: "Contagem de linhas da tabela de parceiros",
      data: d,
    },
  ]

  const informados: Linha[] = [
    { metrica: "Receita (informada)", valor: brl(0), fonte: "INFORMADO", como: "Ainda não há gateway de pagamento nem tabela de cobrança: R$ 0,00 informado pela equipe", data: d },
    ...custos.map((c, i) => ({
      metrica: `Custo ${c.nome} por mês`,
      valor: brl(c.valor),
      fonte: "INFORMADO" as const,
      como: `Valor digitado pela equipe (inicial ${brl(custosIniciais[i].valor)})`,
      data: d,
    })),
    { metrica: "Preço do plano mensal", valor: brl(SIM.p), fonte: "INFORMADO", como: "Preço atual usado em todas as contas", data: d },
    { metrica: "Imposto", valor: "6% da nossa parte", fonte: "INFORMADO", como: "Alíquota usada nas contas; confirmar com o contador", data: d },
    { metrica: "Taxa Asaas", valor: "R$ 2,77 por memorial por ano", fonte: "INFORMADO", como: "Valor usado nas contas; confirmar na cobrança real", data: d },
  ]

  const calculados: Linha[] = [
    { metrica: "Custo fixo por mês", valor: brl(K), fonte: "CALCULADO", como: custos.map((c) => c.nome).join(" + "), data: d },
    {
      metrica: "LIQ: sobra de um memorial nosso por mês",
      valor: brl(LIQ(SIM.p)),
      fonte: "CALCULADO",
      como: "LIQ(p) = (p × 12 × 0,94 − 2,77) ÷ 12, com p = preço mensal",
      data: d,
    },
    {
      metrica: "LIQP: sobra de um memorial de parceiro por mês",
      valor: brl(LIQP(SIM.p, PCT_PADRAO)),
      fonte: "CALCULADO",
      como: "LIQP(p, pct) = (p × (1 − pct) × 12 × 0,94 − 2,77) ÷ 12; o parceiro fica com pct",
      data: d,
    },
    {
      metrica: "EQ: memoriais nossos para empatar",
      valor: inteiro(eq),
      fonte: "CALCULADO",
      como: "EQ(p) = arredonda para cima (custo fixo ÷ LIQ(p))",
      data: d,
    },
    {
      metrica: "EQP: memoriais nossos para empatar com parceiros",
      valor: `${inteiro(EQP(SIM.p, np, PCT_PADRAO, K))} (com ${inteiro(np)} de parceiros)`,
      fonte: "CALCULADO",
      como: "EQP = arredonda para cima ((custo fixo − parceiros × LIQP) ÷ LIQ), nunca abaixo de 0",
      data: d,
    },
    {
      metrica: "Saldo em 12 meses sem receita",
      valor: brl(saldo(12, 0, K)),
      fonte: "CALCULADO",
      como: "saldo = meses × (receita do mês − custo fixo); mês a mês soma o resultado",
      data: d,
    },
    {
      metrica: "Imposto de 6% por memorial",
      valor: brl(SIM.p * 0.06),
      fonte: "CALCULADO",
      como: "preço × 0,06, só sobre a nossa parte",
      data: d,
    },
    {
      metrica: "Taxa Asaas por memorial por mês",
      valor: brl(2.77 / 12),
      fonte: "CALCULADO",
      como: "R$ 2,77 ÷ 12 meses",
      data: d,
    },
    {
      metrica: "Custo por memorial",
      valor: `${brl(K / eq)} com ${inteiro(eq)} memoriais`,
      fonte: "CALCULADO",
      como: "custo fixo ÷ número de memoriais",
      data: d,
    },
    {
      metrica: "Resultado do mês",
      valor: brl(0 - K),
      fonte: "CALCULADO",
      como: "receita do mês − custo fixo (hoje a receita é R$ 0,00)",
      data: d,
    },
  ]

  const exemplos: Linha[] = [
    { metrica: "Parte do parceiro", valor: pct(PCT_PADRAO), fonte: "EXEMPLO", como: "Valor de exemplo; não existe no sistema", data: d },
    { metrica: "Preços do plano anual (R$ 60,00) e do jazigo família", valor: "sugestão a aprovar", fonte: "EXEMPLO", como: "Proposta ainda não cobrada de ninguém", data: d },
    { metrica: "6 famílias e a visão do parceiro", valor: "nomes inventados", fonte: "EXEMPLO", como: "Escritas à mão só para mostrar as telas", data: d },
    {
      metrica: "Novos por mês na simulação",
      valor: `${SIM.sn} nossos e ${SIM.spn} de parceiros`,
      fonte: "SIMULAÇÃO",
      como: "novos × (1 + mês × 0,15); vale só com o botão Simulação ligado",
      data: d,
    },
  ]

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Fontes</h1>
      <Frase>De onde vem cada número do painel, e como cada conta é feita. Valores atuais mudam quando você mexe nos custos.</Frase>

      <CartaoFonte id="fo-reais" fonte="REAL" className="h-auto" titulo="Dados do sistema (Supabase)">
        <Tabela linhas={reais} />
      </CartaoFonte>
      <CartaoFonte id="fo-informados" fonte="INFORMADO" className="h-auto" titulo="Números informados pela equipe">
        <Tabela linhas={informados} />
      </CartaoFonte>
      <CartaoFonte id="fo-calculados" fonte="CALCULADO" className="h-auto" titulo="Contas feitas pelo painel (fórmulas)">
        <Tabela linhas={calculados} />
      </CartaoFonte>
      <CartaoFonte id="fo-exemplos" fonte="EXEMPLO" className="h-auto" titulo="Exemplo e simulação (não são dados da empresa)">
        <Tabela linhas={exemplos} />
      </CartaoFonte>
    </div>
  )
}
