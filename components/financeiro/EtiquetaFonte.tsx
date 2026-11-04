"use client"

import {
  Calculator,
  CircleCheck,
  Pencil,
  FileText,
  CirclePlay,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import React from "react"

import { Badge } from "@/components/financeiro/ui/Badge"
import { Tooltip } from "@/components/financeiro/ui/Tooltip"
import { useEstado } from "@/lib/financeiro/estado"
import { fonteEfetiva } from "@/lib/financeiro/fonte"
import type { Fonte } from "@/lib/financeiro/tipos"

const cfg: Record<
  Fonte,
  { rotulo: string; icone: LucideIcon; classe: string; explica: string }
> = {
  REAL: {
    rotulo: "REAL",
    icone: CircleCheck,
    classe: "bg-emerald-50 text-emerald-900 ring-emerald-600/30",
    explica: "Número que veio direto do sistema (Supabase). Não foi digitado nem estimado.",
  },
  INFORMADO: {
    rotulo: "INFORMADO",
    icone: Pencil,
    classe: "bg-sky-50 text-sky-900 ring-sky-600/30",
    explica: "Número que alguém da equipe informou à mão (por exemplo, o valor das contas).",
  },
  CALCULADO: {
    rotulo: "CALCULADO",
    icone: Calculator,
    classe: "bg-gray-100 text-gray-900 ring-gray-500/30",
    explica: "Resultado de uma conta feita com números reais ou informados.",
  },
  EXEMPLO: {
    rotulo: "EXEMPLO",
    icone: FileText,
    classe: "bg-orange-50 text-orange-900 ring-orange-600/30",
    explica: "Só para mostrar como a tela vai ficar. Não são números da empresa.",
  },
  "SIMULAÇÃO": {
    rotulo: "SIMULAÇÃO",
    icone: CirclePlay,
    classe: "bg-violet-50 text-violet-900 ring-violet-600/40",
    explica: "Número de mentira, de um cenário de crescimento. A receita real continua sendo R$ 0,00.",
  },
}

export function EtiquetaFonte({ fonte: pedida, real }: { fonte: Fonte; real?: boolean }) {
  const { dados } = useEstado()
  const fonte = fonteEfetiva(pedida, real ?? dados.real)
  const c = cfg[fonte]
  const Icone = c.icone
  return (
    <Tooltip content={c.explica} side="bottom" triggerAsChild collisionPadding={12}>
      <Badge
        tabIndex={0}
        data-fonte={fonte}
        aria-label={`Fonte do dado: ${c.rotulo}. ${c.explica}`}
        className={`${c.classe} cursor-help font-semibold`}
      >
        <Icone className="size-4" aria-hidden="true" />
        {c.rotulo}
      </Badge>
    </Tooltip>
  )
}
