export type Fonte = "REAL" | "INFORMADO" | "CALCULADO" | "EXEMPLO" | "SIMULAÇÃO"

export type Custo = { nome: string; valor: number; fonte: Fonte }

export type Parceiro = {
  nome: string
  plano: string
  status: string
  pct: number
}

export type MesMemoriais = { mes: string; total: number }

export type Origem = "Todos" | "Nossos" | "Parceiros"
