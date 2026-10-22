import { supabaseServidor } from '@/lib/supabaseServidor'
import { slugificar, urlCanonicaMemorial, type DadosUrlMemorial } from '@/lib/urlMemorial'
import { headers } from 'next/headers'
import { permanentRedirect } from 'next/navigation'

type Cem = { slug_curto: string | null; cidade: string | null }
type Lap = { id_publico: number | string | null; numero_oficial: string | null; cemiterios: Cem | Cem[] | null }

const um = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

/** Busca os pedaços pelo slug do memorial. Sem túmulo/cemitério: só { slug }. */
export async function buscarDadosUrlMemorial(slug: string): Promise<DadosUrlMemorial> {
  const { data, error } = await supabaseServidor
    .from('homenagens')
    // homenagens e lapides têm 2 FKs (lapide_id e gestor_homenagem_id): sem o !hint o PostgREST
    // devolve PGRST201 e o endereço cai sempre no curto.
    .select('id, lapides!homenagens_lapide_id_fkey(id_publico, numero_oficial, cemiterios(slug_curto, cidade))')
    .eq('slug', slug)
    .maybeSingle()
  if (error) console.error('urlMemorial: consulta falhou', error.message)
  if (!data) return { slug }

  const { data: seg } = await supabaseServidor
    .from('homenagens_seguranca')
    .select('modo_gate')
    .eq('homenagem_id', (data as { id: string }).id)
    .maybeSingle()

  const lap = um((data as unknown as { lapides: Lap | Lap[] | null }).lapides)
  const cem = um(lap?.cemiterios)
  return {
    slug,
    cidade: cem?.cidade ?? null,
    cemiterioSlug: cem?.slug_curto ?? null,
    idPublico: lap?.id_publico ?? null,
    numeroOficial: lap?.numero_oficial ?? null,
    aberto: (seg?.modo_gate ?? 'aberto') === 'aberto',
  }
}

export async function urlCanonicaPorSlug(slug: string): Promise<string> {
  return urlCanonicaMemorial(await buscarDadosUrlMemorial(slug))
}

/**
 * Chamar no topo de app/homenagem/[slug]/page.tsx. Devolve os dados (reuso).
 * - Curto (sem cabeçalho x-memorial-caminho) e existe canônico longo -> 308 pro longo.
 * - Longo (o proxy reescreveu e mandou o caminho original) que não bate com o
 *   canônico -> 308 pro canônico (ou pro curto).
 * Sem loop: o rewrite do proxy é interno (não refaz requisição); o 308 só
 * ocorre quando o caminho ATUAL difere do canônico. Preserva ?qr=.
 */
export async function redirecionarSeNaoCanonico(
  slug: string,
  searchParams: Record<string, string | string[] | undefined>
): Promise<DadosUrlMemorial> {
  const h = await headers()
  const caminhoOriginal = h.get('x-memorial-caminho') // só o proxy escreve (e sobrescreve qualquer valor do cliente)
  const dados = await buscarDadosUrlMemorial(slug)
  const canonica = urlCanonicaMemorial(dados)
  const atual = caminhoOriginal ?? `/homenagem/${slug}`
  if (atual !== canonica) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x))
      else if (v !== undefined) qs.set(k, v)
    }
    const s = qs.toString()
    permanentRedirect(s ? `${canonica}?${s}` : canonica)
  }
  return dados
}

/**
 * Link pro mapa PÚBLICO do cemitério do memorial (/cemiterios/{cidade-uf}/{slug}), pro atalho
 * "ver outros memoriais neste cemitério". Só devolve se o cemitério está ativo e marcado como
 * público (senão a página do cemitério dá 404). Sem túmulo/cemitério: null.
 */
export async function hrefMapaPublicoDoMemorial(slug: string): Promise<string | null> {
  const { data, error } = await supabaseServidor
    .from('homenagens')
    .select('lapides!homenagens_lapide_id_fkey(cemiterios(slug, publico, ativo, cidade, estado))')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  type C = { slug: string | null; publico: boolean | null; ativo: boolean | null; cidade: string | null; estado: string | null }
  const lap = um((data as unknown as { lapides: { cemiterios: C | C[] | null } | { cemiterios: C | C[] | null }[] | null }).lapides)
  const c = um(lap?.cemiterios)
  if (!c || !c.slug || !c.publico || c.ativo === false || !c.cidade || !c.estado) return null
  return `/cemiterios/${slugificar(c.cidade.trim())}-${c.estado.trim().toLowerCase()}/${c.slug}`
}
