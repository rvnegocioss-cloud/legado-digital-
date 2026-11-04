"use client"

import Link from "next/link"

import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRoot, TableRow } from "@/components/financeiro/ui/Table"
import { brl, inteiro, pct } from "@/lib/financeiro/formato"
import { SIM } from "@/lib/financeiro/padroes"
import { CartaoFonte, Frase } from "./Blocos"

export type MemorialDoParceiro = { criadoEm: string; criadoEmTexto: string; origem: string | null }

const ORIGEM_TEXTO: Record<string, string> = {
  central: "Cadastrado pela equipe Legado",
  parceiro: "Cadastrado por você",
  mapa_cemiterio: "Cadastrado no cemitério",
  familia: "Cadastrado pela família",
}

function Destaque({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap text-3xl font-bold text-[var(--tinta)]">{children}</span>
}

// Mês corrente no horário de Brasília (UTC-3).
function mesDe(iso: string) {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000)
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

// Visão do Parceiro: SÓ dados daquele parceiro (a API já filtra no servidor).
// Nada nosso: sem custo fixo, sem outros parceiros, sem margem.
export function VisaoParceiro({
  nome,
  memoriais,
  estado,
  mensagemErro,
  editarHref,
}: {
  nome: string
  memoriais: MemorialDoParceiro[]
  estado: "carregando" | "ok" | "erro"
  mensagemErro?: string
  editarHref: string
}) {
  const agora = mesDe(new Date().toISOString())
  const noMes = memoriais.filter((m) => mesDe(m.criadoEm) === agora).length
  const tabela = memoriais.length * SIM.p
  // parte do parceiro = % do valor cobrado (30% é o padrão informado, ainda não vem do contrato)
  const parte = memoriais.length * SIM.p * SIM.pct

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="ldf-titulo font-bold text-[var(--tinta)]">Olá, {nome}</h1>
        <Link
          href={editarHref}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-[var(--tinta)] hover:bg-gray-100"
        >
          Editar meu nome
        </Link>
      </div>
      <Frase>
        {estado === "carregando"
          ? "Consultando os seus memoriais..."
          : estado === "erro"
            ? (mensagemErro ?? "Não foi possível consultar agora.")
            : "Aqui aparece apenas o que é seu. Os valores em reais ainda são de EXEMPLO, porque o pagamento dos clientes ainda não está ligado ao sistema."}
      </Frase>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <CartaoFonte kpi id="pa-cadastrou" fonte="REAL" titulo="Memoriais deste mês">
          <p className="mt-auto pt-3 text-lg font-medium text-[var(--tinta)]">
            Você cadastrou <Destaque>{inteiro(noMes)}</Destaque> memoriais este mês.
          </p>
        </CartaoFonte>
        <CartaoFonte kpi id="pa-total" fonte="REAL" titulo="Memoriais cadastrados">
          <p className="mt-auto pt-3 text-lg font-medium text-[var(--tinta)]">
            Ao todo são <Destaque>{inteiro(memoriais.length)}</Destaque> memoriais seus.
          </p>
        </CartaoFonte>
        <CartaoFonte kpi id="pa-pagaram" fonte="EXEMPLO" titulo="Valor de tabela dos seus memoriais">
          <p className="mt-auto pt-3 text-lg font-medium text-[var(--tinta)]">
            Pelo plano mensal de {brl(SIM.p)}: <Destaque>{brl(tabela)}</Destaque> por mês.
          </p>
        </CartaoFonte>
        <CartaoFonte kpi id="pa-recebe" fonte="EXEMPLO" titulo="A sua parte">
          <p className="mt-auto pt-3 text-lg font-medium text-[var(--tinta)]">
            Você receberia <Destaque>{brl(parte)}</Destaque> ({pct(SIM.pct)} do valor de tabela).
          </p>
        </CartaoFonte>
      </div>

      <CartaoFonte id="pa-lista" fonte="REAL" titulo="Seus memoriais">
        {memoriais.length === 0 ? (
          <Frase>Você ainda não tem memoriais cadastrados.</Frase>
        ) : (
          <TableRoot className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Criado em</TableHeaderCell>
                  <TableHeaderCell>Como foi cadastrado</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memoriais.map((m, i) => (
                  <TableRow key={`${m.criadoEm}-${i}`}>
                    <TableCell className="font-medium text-[var(--tinta)]">{m.criadoEmTexto}</TableCell>
                    <TableCell>{(m.origem && ORIGEM_TEXTO[m.origem]) || "Origem não registrada"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRoot>
        )}
      </CartaoFonte>
    </div>
  )
}
