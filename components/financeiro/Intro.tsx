"use client"

import React from "react"

import { Button } from "@/components/financeiro/ui/Button"
import { useEstado } from "@/lib/financeiro/estado"

const passos = [
  {
    titulo: "Bem-vindo ao painel do Legado Digital",
    texto:
      "Aqui você vê, em palavras simples, quanto dinheiro sai, quanto entra e quantos memoriais precisamos para pagar as contas. Receita, contas e preços ainda são números INFORMADOS ou de EXEMPLO (não há gateway de pagamento ligado); só memoriais e parceiros vêm do sistema.",
  },
  {
    titulo: "Como ler cada cartão",
    texto:
      "Todo cartão tem uma etiqueta no canto: REAL (veio do sistema), INFORMADO (alguém digitou), CALCULADO (é uma conta) ou SIMULAÇÃO (número de mentira). A cor mostra a situação, sempre com palavra: No azul, Atenção ou No vermelho.",
  },
  {
    titulo: "Os botões do topo",
    texto:
      "Simples mostra só frases e cartões; Detalhado mostra também os gráficos. Simulação testa um cenário de crescimento sem mexer nos números reais. Ajuda liga os pontos de interrogação: passe o mouse neles para ler a explicação.",
  },
]

export function Intro() {
  const { introVisto, marcarIntroVisto } = useEstado()
  const [i, setI] = React.useState(0)
  if (introVisto) return null
  const p = passos[i]
  const ultimo = i === passos.length - 1
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ld-bg)]/70 p-4"
    >
      <div className="w-full max-w-xl rounded-lg bg-white p-7 shadow-xl">
        <p className="text-sm font-semibold text-[var(--ldb-700)]">
          Passo {i + 1} de {passos.length}
        </p>
        <h2 id="intro-titulo" className="ldf-marca mt-1 text-2xl text-[var(--tinta)]">
          {p.titulo}
        </h2>
        <p className="mt-3 text-base leading-7 text-gray-700">{p.texto}</p>
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={marcarIntroVisto}>
            Pular
          </Button>
          <div className="flex gap-2">
            {i > 0 ? (
              <Button variant="secondary" onClick={() => setI(i - 1)}>
                Voltar
              </Button>
            ) : null}
            <Button onClick={() => (ultimo ? marcarIntroVisto() : setI(i + 1))}>
              {ultimo ? "Começar" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
