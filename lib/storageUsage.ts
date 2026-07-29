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
    if (item.id && item.id.endsWith('/')) {
      const { data: subItems } = await supabase.storage
        .from('memoriais')
        .list(`${homenagemId}/${item.name}`, { limit: 10000 })
      if (subItems) queue.push(...subItems)
    } else if (item.id && !item.id.endsWith('/')) {
      totalBytes += item.metadata?.size || 0
    }
  }

  return totalBytes
}
