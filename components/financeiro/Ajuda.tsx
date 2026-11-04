"use client"

import { CircleHelp } from "lucide-react"
import React from "react"
import { ReferenceDot, ReferenceLine } from "recharts"

import { Tooltip } from "@/components/financeiro/ui/Tooltip"
import { useEstado } from "@/lib/financeiro/estado"

// Ponto de interrogação ao lado de um termo técnico. Só aparece com a Ajuda ligada;
// a explicação aparece ao passar o mouse, focar ou tocar.
export function Termo({
  children,
  explica,
}: {
  children: React.ReactNode
  explica: string
}) {
  const { ajuda } = useEstado()
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      {ajuda ? (
        <Tooltip content={explica} side="top" triggerAsChild collisionPadding={12}>
          <button
            type="button"
            data-ajuda-termo="1"
            aria-label={`O que é: ${explica}`}
            className="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full bg-[var(--ldb-500)] text-[var(--ld-bg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ld-bg)]"
          >
            <CircleHelp className="size-4" aria-hidden="true" />
          </button>
        </Tooltip>
      ) : null}
    </span>
  )
}

function PontoAjuda({
  cx,
  cy,
  texto,
}: {
  cx?: number
  cy?: number
  texto: string
}) {
  if (cx == null || cy == null) return <g />
  return (
    <Tooltip content={texto} side="top" triggerAsChild collisionPadding={12}>
      <g
        tabIndex={0}
        role="button"
        aria-label={texto}
        className="cursor-help outline-none"
        data-ajuda-grafico="1"
      >
        <circle cx={cx} cy={cy} r={11} fill="var(--ld-gold)" stroke="var(--ld-bg)" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fill="var(--ld-bg)"
        >
          ?
        </text>
      </g>
    </Tooltip>
  )
}

type LinhaH = {
  chave: string
  y: number
  xPonto: string
  texto: string
  cor?: string
  /** deslocamento vertical do ponto em pixels (negativo = acima da linha) */
  dy?: number
}

// Linha horizontal de referência com ponto de ajuda (balão no hover).
export function linhaHorizontal(l: LinhaH): React.ReactNode[] {
  const cor = l.cor ?? "var(--cor-linha)"
  return [
    <ReferenceLine
      key={`${l.chave}-l`}
      y={l.y}
      stroke={cor}
      strokeWidth={2}
      strokeDasharray="6 4"
      ifOverflow="extendDomain"
    />,
    <ReferenceDot
      key={`${l.chave}-d`}
      x={l.xPonto}
      y={l.y}
      r={0}
      ifOverflow="extendDomain"
      shape={(p: any) => (
        <PontoAjuda cx={p.cx} cy={p.cy + (l.dy ?? -16)} texto={l.texto} />
      )}
    />,
  ]
}

type LinhaV = { chave: string; x: string; yPonto: number; texto: string; dy?: number }

// Marcador vertical (ex.: "Hoje") com ponto de ajuda.
export function linhaVertical(l: LinhaV): React.ReactNode[] {
  return [
    <ReferenceLine
      key={`${l.chave}-l`}
      x={l.x}
      stroke="var(--cor-ouro)"
      strokeWidth={2}
      strokeDasharray="2 4"
    />,
    <ReferenceDot
      key={`${l.chave}-d`}
      x={l.x}
      y={l.yPonto}
      r={0}
      ifOverflow="extendDomain"
      shape={(p: any) => (
        <PontoAjuda cx={p.cx + 18} cy={p.cy + (l.dy ?? 14)} texto={l.texto} />
      )}
    />,
  ]
}

// Ponto solto com balão (ex.: "olhe aqui").
export function pontoSolto(o: {
  chave: string
  x: string
  y: number
  texto: string
}): React.ReactNode[] {
  return [
    <ReferenceDot
      key={o.chave}
      x={o.x}
      y={o.y}
      r={0}
      ifOverflow="extendDomain"
      shape={(p: any) => <PontoAjuda cx={p.cx} cy={p.cy} texto={o.texto} />}
    />,
  ]
}
