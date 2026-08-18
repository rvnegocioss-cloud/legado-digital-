import 'server-only'
import { createClient } from '@supabase/supabase-js'

// O ortomosaico é o ativo mais caro do projeto (voo + processamento) e estava
// num balde público: qualquer um que abrisse o mapa e olhasse a requisição
// baixava o arquivo inteiro. Agora o balde é privado e a URL é assinada na
// hora, com validade curta.
//
// PMTiles funciona por range request (baixa só o pedaço de tile que precisa) e
// a URL assinada do Supabase preserva isso — o mapa continua igual pra quem vê.

const MARCADOR = '/object/public/mapas/'
const VALIDADE_SEGUNDOS = 60 * 60 * 12 // 12h: sessão longa de mapa não pode expirar no meio

export function caminhoDoOrtomosaico(url: string | null | undefined) {
  if (!url) return null
  const i = url.indexOf(MARCADOR)
  if (i < 0) return null
  return decodeURIComponent(url.slice(i + MARCADOR.length).split('?')[0])
}

/**
 * Troca a URL pública gravada em `cemiterios.ortomosaico_url` por uma assinada.
 * Se falhar, devolve a original — mapa quebrado é pior que arquivo exposto,
 * e a exposição volta a ser só o que já era antes.
 */
export async function assinarOrtomosaico(url: string | null | undefined) {
  const caminho = caminhoDoOrtomosaico(url)
  if (!caminho) return url ?? null

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabase.storage.from('mapas').createSignedUrl(caminho, VALIDADE_SEGUNDOS)
    if (error || !data?.signedUrl) return url ?? null
    return data.signedUrl
  } catch {
    return url ?? null
  }
}
