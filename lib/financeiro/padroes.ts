import type { Custo, MesMemoriais, Parceiro } from "./tipos"

// Fotografia do Supabase de 04/11/2026 (fonte REAL), somente leitura.
export const DATA_SNAPSHOT = "04/11/2026"

export const memoriaisPorMes: MesMemoriais[] = [
  { mes: "Jul", total: 2 },
  { mes: "Ago", total: 5 },
  { mes: "Set", total: 1 },
  { mes: "Out", total: 5 },
  { mes: "Nov", total: 0 },
]

export const memoriaisPorOrigem = {
  mapaCemiterio: 5,
  central: 2,
  semOrigem: 6,
  deParceiros: 0,
}

export const parceiros: (Parceiro & { criadaEm: string })[] = [
  {
    nome: "Funerária Vale da Paz",
    plano: "Essencial",
    status: "em dia",
    pct: 0.3,
    criadaEm: "22/09/2026",
  },
  {
    nome: "Planos Legado Digital",
    plano: "canal comercial",
    status: "em dia",
    pct: 0.3,
    criadaEm: "14/09/2026",
  },
]

export const PCT_PADRAO = 0.3
export const RECEITA_REAL = 0

export const custosIniciais: Custo[] = [
  { nome: "Supabase", valor: 137.5, fonte: "INFORMADO" },
  { nome: "Vercel", valor: 110, fonte: "INFORMADO" },
  { nome: "Contador", valor: 249, fonte: "INFORMADO" },
]

// Memoriais por mês separados por origem (Nossos x Parceiros). REAL: todos são nossos, parceiro = 0.
export const memoriaisPorMesOrigem = memoriaisPorMes.map((m) => ({
  mes: m.mes,
  Nossos: m.total,
  Parceiros: 0,
}))

export const TOTAL_MEMORIAIS = memoriaisPorMes.reduce((t, m) => t + m.total, 0)
export const PLANOS = [
  { nome: "Memorial mensal", preco: 5, unidade: "por mês", sugestao: false },
  { nome: "Memorial anual", preco: 60, unidade: "por ano (equivale a R$ 5,00 por mês)", sugestao: true },
  { nome: "Jazigo família", preco: 5, unidade: "1º memorial + R$ 2,99 por memorial extra", sugestao: true },
] as const

// Parâmetros da simulação (exemplo de crescimento, NÃO é dado real).
export const SIM = { p: 5, pct: 0.3, sn: 3, spn: 1, crescimento: 0.15 }
// Razão de memoriais de parceiro para cada memorial nosso na simulação do Equilíbrio.
export const RAZAO_PARCEIROS = SIM.spn / SIM.sn
// Famílias de exemplo da tela Planos de pagamento (NÃO são reais).
export const FAMILIAS_EXEMPLO = [
  { familia: "Família Saraiva", memoriais: 2, plano: "Jazigo família", proxima: "15/11/2026", valor: 7.99, status: "Em dia" },
  { familia: "Família Costa Lima", memoriais: 2, plano: "Jazigo família", proxima: "02/11/2026", valor: 7.99, status: "Em dia" },
  { familia: "Família Naves", memoriais: 1, plano: "Memorial anual", proxima: "10/03/2027", valor: 60, status: "Em dia" },
  { familia: "Família Ferreira", memoriais: 1, plano: "Memorial mensal", proxima: "05/11/2026", valor: 5, status: "Atrasada" },
  { familia: "Família Martins", memoriais: 1, plano: "Memorial mensal", proxima: "20/11/2026", valor: 5, status: "Em dia" },
  { familia: "Família Alves", memoriais: 1, plano: "Memorial mensal", proxima: "—", valor: 5, status: "Cancelada" },
] as const
// Memoriais de exemplo do parceiro fictício da Visão do Parceiro (NÃO são reais).
export const PARCEIRO_EXEMPLO = {
  nome: "Funerária Exemplo",
  pct: 0.3,
  memoriais: [
    { familia: "Família Andrade", criadoEm: "03/11/2026", valor: 5, status: "Pago" },
    { familia: "Família Barbosa", criadoEm: "02/11/2026", valor: 5, status: "Pago" },
    { familia: "Família Cardoso", criadoEm: "28/10/2026", valor: 60, status: "Pago" },
    { familia: "Família Duarte", criadoEm: "20/10/2026", valor: 5, status: "Atrasado" },
    { familia: "Família Esteves", criadoEm: "04/11/2026", valor: 5, status: "Aguardando pagamento" },
    { familia: "Família Faria", criadoEm: "15/10/2026", valor: 5, status: "Cancelado" },
  ],
} as const
