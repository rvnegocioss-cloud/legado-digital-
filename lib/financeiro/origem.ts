"use client"

import { useEstado } from "./estado"
import type { Origem } from "./tipos"

export const ORIGENS = ["Todos", "Nossos", "Parceiros"] as const satisfies readonly Origem[]

// Origem fica no estado da área financeira (sem nuqs); mesma assinatura [valor, setter].
export function useOrigem(): [Origem, (o: Origem | null) => void] {
  const { origem, setOrigem } = useEstado()
  return [origem, (o) => setOrigem(o ?? "Todos")]
}
