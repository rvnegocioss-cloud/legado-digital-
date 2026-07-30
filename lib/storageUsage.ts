import type { SupabaseClient } from '@supabase/supabase-js'

// Soma o tamanho de todos os arquivos de um memorial no Storage (recursivo,
// já que foto/video/galeria são subpastas). Usa client com service role —
// só assim o `metadata.size` de cada arquivo vem preenchido de verdade.
export async function getMemorialStorageUsage(
  supabase: SupabaseClient,
  homenagemId: string
): Promise<number> {
  const { data: arquivos, error } = await supabase.storage
    .from('memoriais')
    .list(homenagemId, { limit: 10000 })

  if (error || !arquivos) return 0

  let totalBytes = 0
  const queue = arquivos.slice()

  for (const item of queue) {
    // Supabase Storage: entrada de PASTA sempre volta com id null (nunca
    // "termina com /" como o código antigo assumia) — por isso a soma
    // sempre dava 0, nenhum item caía em nenhum dos dois ramos e a
    // recursão nunca entrava nas subpastas foto/video/galeria.
    if (!item.id) {
      const { data: subItems } = await supabase.storage
        .from('memoriais')
        .list(`${homenagemId}/${item.name}`, { limit: 10000 })
      if (subItems) queue.push(...subItems)
    } else {
      totalBytes += item.metadata?.size || 0
    }
  }

  return totalBytes
}
