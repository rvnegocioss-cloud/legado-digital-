// Resolução de edição concorrente do memorial.
//
// Existe porque a família e a equipe (funerária/Central) editam o MESMO
// registro, e `homenagens` tem trigger que carimba `updated_at` em qualquer
// escrita. Comparar a linha inteira — como era antes — fazia "alguém anexou uma
// foto" bloquear quem estava escrevendo a biografia, e a única saída oferecida
// era recarregar a página, que joga fora o texto não salvo.
//
// Regra: só é conflito quando as duas pessoas mexeram no MESMO campo.
// Campo que a pessoa não tocou nem é gravado nem é checado.

export interface ResolucaoConflito {
  /** O que de fato vai ser gravado (só o que mudou de verdade). */
  paraGravar: Record<string, unknown>
  /** Campos em que os dois lados mexeram — se tiver algum, não grava nada. */
  conflitos: string[]
}

function mesmoValor(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export function resolverConflito(
  /** O que a tela está mandando (formulário inteiro, normalmente). */
  enviado: Record<string, unknown>,
  /** Como cada campo estava quando a tela carregou. */
  base: Record<string, unknown> | null | undefined,
  /** Como cada campo está agora no banco. */
  atual: Record<string, unknown>
): ResolucaoConflito {
  const paraGravar: Record<string, unknown> = { ...enviado }

  // Sem base (tela antiga), quem decide é a trava por updated_at lá na rota.
  if (!base || typeof base !== 'object') {
    return { paraGravar, conflitos: [] }
  }

  for (const campo of Object.keys(paraGravar)) {
    if (campo in base && mesmoValor(base[campo], paraGravar[campo])) {
      delete paraGravar[campo]
    }
  }

  const conflitos = Object.keys(paraGravar).filter(
    (campo) => campo in base && !mesmoValor(base[campo], atual[campo])
  )

  return { paraGravar, conflitos }
}
