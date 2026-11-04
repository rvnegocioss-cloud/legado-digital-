"use client"

import { useDadosReais } from "@/lib/financeiro/estado"

import React from "react"

import { Badge } from "@/components/financeiro/ui/Badge"
import { Input } from "@/components/financeiro/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/financeiro/ui/Table"
import { PLANOS } from "@/lib/financeiro/padroes"
import { LIQ, LIQP } from "@/lib/financeiro/financeiro"
import { brl } from "@/lib/financeiro/formato"
import { FAMILIAS_EXEMPLO, SIM } from "@/lib/financeiro/padroes"
import { Termo } from "./Ajuda"
import { CartaoFonte, Frase } from "./Blocos"

const statusVar = { "Em dia": "success", Atrasada: "warning", Cancelada: "error" } as const

export function Planos() {
  const { parceiros } = useDadosReais()
  const [pcts, setPcts] = React.useState<number[]>(parceiros.map((p) => Math.round(p.pct * 100)))

  const recorrente = FAMILIAS_EXEMPLO.filter((f) => f.status === "Em dia").reduce(
    (t, f) => t + (f.plano === "Memorial anual" ? f.valor / 12 : f.valor),
    0,
  )

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Planos de pagamento</h1>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CartaoFonte id="pl-planos" fonte="INFORMADO" titulo="Planos e preços">
          <Frase>
            O plano mensal de {brl(5)} é o que usamos nas contas. O anual e o jazigo família ainda são sugestões para
            você aprovar.
          </Frase>
          <TableRoot className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Plano</TableHeaderCell>
                  <TableHeaderCell>Preço</TableHeaderCell>
                  <TableHeaderCell>Situação</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PLANOS.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium text-[var(--tinta)]">{p.nome}</TableCell>
                    <TableCell>
                      <span className="font-medium text-[var(--tinta)]">{brl(p.preco)}</span> {p.unidade}
                    </TableCell>
                    <TableCell>
                      {p.sugestao ? (
                        <Badge variant="warning">Sugestão a aprovar</Badge>
                      ) : (
                        <Badge variant="success">Em uso</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRoot>
        </CartaoFonte>

        <CartaoFonte
          id="pl-parceiros"
          fonte="EXEMPLO"
          titulo={
            <Termo explica="O parceiro cobra do cliente e fica com essa porcentagem. Só a nossa parte paga imposto de 6% e a taxa do Asaas. Os 30% são um valor de exemplo; não existe no sistema.">
              Parceiros e a parte de cada um
            </Termo>
          }
        >
          <Frase>Mude a porcentagem e veja quanto sobra para nós em um memorial de {brl(SIM.p)}.</Frase>
          <TableRoot className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Parceiro</TableHeaderCell>
                  <TableHeaderCell>Parte dele (%)</TableHeaderCell>
                  <TableHeaderCell>Nossa parte por memorial</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parceiros.map((p, i) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium text-[var(--tinta)]">{p.nome}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        aria-label={`Porcentagem do parceiro ${p.nome}`}
                        value={pcts[i]}
                        onChange={(e) => {
                          const n = Math.min(100, Math.max(0, Number(e.target.value) || 0))
                          setPcts(pcts.map((v, j) => (j === i ? n : v)))
                        }}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>{brl(LIQP(SIM.p, pcts[i] / 100))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRoot>
          <p className="mt-3 text-sm text-gray-600">
            Memorial nosso, sem parceiro, deixa {brl(LIQ(SIM.p))} por mês.
          </p>
        </CartaoFonte>
      </div>

      <CartaoFonte id="pl-familias" fonte="EXEMPLO" className="flex-1" titulo="Famílias com assinatura (EXEMPLO)">
        <Frase>
          EXEMPLO: estas 6 famílias são inventadas, só para mostrar a tela. Hoje nenhum memorial gera receita. Nesta
          lista de mentira, a receita mensal seria {brl(recorrente)}.
        </Frase>
        <TableRoot className="mt-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Família</TableHeaderCell>
                <TableHeaderCell>Memoriais</TableHeaderCell>
                <TableHeaderCell>Plano</TableHeaderCell>
                <TableHeaderCell>Próxima cobrança</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {FAMILIAS_EXEMPLO.map((f) => (
                <TableRow key={f.familia}>
                  <TableCell className="font-medium text-[var(--tinta)]">{f.familia}</TableCell>
                  <TableCell>{f.memoriais}</TableCell>
                  <TableCell>{f.plano}</TableCell>
                  <TableCell>{f.proxima}</TableCell>
                  <TableCell>{brl(f.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVar[f.status]}>{f.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
      </CartaoFonte>
    </div>
  )
}
