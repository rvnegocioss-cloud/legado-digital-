// Quem escreve a biografia usa **asterisco** pra marcar negrito -- é o hábito
// de quem escreve em WhatsApp e em editor de texto. O campo é texto puro, então
// isso aparecia cru na tela: "**Carlos Saraiva, conhecido..." com os asteriscos
// à mostra (42 deles no memorial do Carlos Saraiva).
//
// Isto NÃO altera o texto guardado no banco -- só interpreta na hora de exibir.
// Sem HTML: devolve pedaços marcados, e quem renderiza monta <strong> de
// verdade. Injeção de HTML numa biografia escrita pela família seria buraco
// aberto, então nem passa perto de dangerouslySetInnerHTML.

export interface PedacoTexto {
  texto: string
  negrito: boolean
}

/** Quebra "a **b** c" em [{a},{b,negrito},{ c}]. Asterisco solto fica literal. */
export function lerNegrito(linha: string): PedacoTexto[] {
  const pedacos: PedacoTexto[] = []
  let resto = linha

  while (resto.length > 0) {
    const abre = resto.indexOf('**')
    if (abre < 0) {
      pedacos.push({ texto: resto, negrito: false })
      break
    }

    const fecha = resto.indexOf('**', abre + 2)
    if (fecha < 0) {
      // Abriu e nunca fechou: mantém como está em vez de comer o resto do
      // parágrafo em negrito.
      pedacos.push({ texto: resto, negrito: false })
      break
    }

    if (abre > 0) pedacos.push({ texto: resto.slice(0, abre), negrito: false })
    const dentro = resto.slice(abre + 2, fecha)
    if (dentro.length > 0) pedacos.push({ texto: dentro, negrito: true })
    resto = resto.slice(fecha + 2)
  }

  return pedacos.filter((p) => p.texto.length > 0)
}

/** Separa a biografia em parágrafos, já com o negrito lido. */
export function lerParagrafos(texto: string | null | undefined): PedacoTexto[][] {
  if (!texto) return []
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(lerNegrito)
}

/** Texto sem marcação, pra contar caracteres ou gerar resumo. */
export function semMarcacao(texto: string | null | undefined): string {
  return (texto || '').replace(/\*\*/g, '')
}
