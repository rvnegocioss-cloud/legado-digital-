import type { SupabaseClient } from '@supabase/supabase-js'

export function gerarSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Nome repetido (comum — "Maria Silva" não é raro) gerava o mesmo slug pra
// dois memoriais diferentes. Sem UNIQUE no banco isso corrompia login da
// família/upload/página pública do primeiro registro sem erro nenhum na
// hora do cadastro; com UNIQUE (adicionado hoje) o insert simplesmente
// falhava. Aqui resolve os dois: acha o próximo slug livre (-2, -3, ...)
// antes de salvar.
export async function gerarSlugUnico(
  supabase: SupabaseClient,
  nome: string,
  idParaIgnorar?: string
): Promise<string> {
  const base = gerarSlug(nome)
  let candidato = base
  let tentativa = 1

  while (true) {
    let query = supabase.from('homenagens').select('id').eq('slug', candidato).limit(1)
    if (idParaIgnorar) query = query.neq('id', idParaIgnorar)
    const { data } = await query
    if (!data || data.length === 0) return candidato
    tentativa += 1
    candidato = `${base}-${tentativa}`
  }
}
