import { supabaseServidor } from '@/lib/supabaseServidor'
import { assinarOrtomosaico } from '@/lib/ortomosaicoAssinado'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Cemitério mostrado no mapa da landing e da página do parceiro: o mapa real,
// não uma ilustração. Saiu de dentro de app/(site)/page.tsx em 2026-10-09,
// quando a página do parceiro passou a usar o mesmo bloco.
//
// Sem `preferidos`, pega o primeiro cemitério público que já tem ortomosaico
// de drone (hoje o São Pedro, Uberlândia). Com `preferidos` (slugs dos
// cemitérios onde aquele parceiro atua), tenta um deles primeiro e só cai no
// geral se nenhum tiver mapa aéreo. Se nada tiver, devolve null e o bloco
// some em vez de mostrar um retângulo vazio.
//
// Só usa as RPCs públicas (listar_cidades_publicas, listar_cemiterios_publicos,
// obter_mapa_publico_cemiterio), então o filtro de privacidade dos memoriais é
// o mesmo do mapa público -- nada novo fica exposto aqui.

export interface CemiterioDestaque {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cemiterio: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoriais: any
  ortoUrl: string | null
  total: number
  href: string
  /** true quando veio da lista de preferidos (cemitério do próprio parceiro). */
  doParceiro: boolean
}

async function carregar(cidadeSlug: string, slug: string, doParceiro: boolean): Promise<CemiterioDestaque | null> {
  const { data } = await supabaseServidor.rpc('obter_mapa_publico_cemiterio', { p_slug: slug })
  if (!data) return null

  const ortoUrl = await assinarOrtomosaico(data.cemiterio.ortomosaico_url)
  const memoriais = {
    ...data.memoriais,
    features: (data.memoriais?.features || []).map((f: { properties?: Record<string, unknown> }) => ({
      ...f,
      properties: {
        ...f.properties,
        foto_url: urlMidiaProtegida(f.properties?.foto_url as string | null),
      },
    })),
  }

  return {
    cemiterio: data.cemiterio,
    memoriais,
    ortoUrl,
    total: memoriais.features.length,
    href: `/cemiterios/${cidadeSlug}/${slug}`,
    doParceiro,
  }
}

export async function buscarCemiterioDestaque(preferidos: string[] = []): Promise<CemiterioDestaque | null> {
  const { data: cidades } = await supabaseServidor.rpc('listar_cidades_publicas')
  const comMapa: { cidade: string; slug: string }[] = []

  for (const c of (cidades || []) as { cidade_slug: string }[]) {
    const { data: cems } = await supabaseServidor.rpc('listar_cemiterios_publicos', {
      p_cidade_slug: c.cidade_slug,
    })
    for (const x of (cems || []) as { slug: string; tem_ortomosaico: boolean }[]) {
      if (x.tem_ortomosaico) comMapa.push({ cidade: c.cidade_slug, slug: x.slug })
    }
  }

  const ordenados = [
    ...comMapa.filter((x) => preferidos.includes(x.slug)),
    ...comMapa.filter((x) => !preferidos.includes(x.slug)),
  ]
  for (const x of ordenados) {
    const achado = await carregar(x.cidade, x.slug, preferidos.includes(x.slug))
    if (achado) return achado
  }
  return null
}
