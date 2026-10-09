import { supabaseServidor } from '@/lib/supabaseServidor'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Dados que a página pública (/parceiros/[slug]) e a apresentação guiada
// (/apresentacao/[slug]) mostram de um parceiro.
//
// Lido no servidor, com service role e LISTA DE COLUNAS EXPLÍCITA: e-mail,
// CNPJ, telefone interno, plano e pagamento nunca saem daqui. Só entra
// parceiro ativo e com endereço de página.

export interface ParceiroPublico {
  id: string
  nome: string
  slug: string
  logo: string | null
  capa: string | null
  frase: string | null
  local: string | null
  whatsapp: string | null
  telefone: string | null
  endereco: string | null
}

export interface MemorialVitrine {
  nome_completo: string
  slug: string
  foto: string | null
  frase_preferida: string | null
  cidade: string | null
  anos: string | null
  /** true = registro fictício do sistema; false = memorial real e aberto do parceiro. */
  ficticio: boolean
}

export const CAPA_PADRAO = '/parceiro-pagina/capa-padrao.jpg'

// Mesmo registro fictício usado na landing.
const SLUG_EXEMPLO = 'helena-martins-costa'

export async function carregarParceiroPublico(slug: string): Promise<ParceiroPublico | null> {
  const { data } = await supabaseServidor
    .from('parceiros_b2b')
    .select(
      'id, nome_fantasia, razao_social, slug, logo_url, capa_url, descricao_publica, cidade, estado, whatsapp_publico, telefone_publico, endereco_publico'
    )
    .eq('slug', slug)
    .eq('ativo', true)
    .maybeSingle()

  if (!data || !data.slug) return null
  return {
    id: data.id,
    nome: data.nome_fantasia || data.razao_social,
    slug: data.slug,
    logo: urlMidiaProtegida(data.logo_url),
    capa: urlMidiaProtegida(data.capa_url),
    frase: data.descricao_publica,
    local: [data.cidade, data.estado].filter(Boolean).join(' — ') || null,
    whatsapp: data.whatsapp_publico,
    telefone: data.telefone_publico,
    endereco: data.endereco_publico,
  }
}

/** Slugs dos cemitérios públicos onde o parceiro atua (vínculo antigo 1:1 ou a tabela N:N). */
export async function cemiteriosDoParceiro(parceiroId: string): Promise<string[]> {
  const [{ data: diretos }, { data: vinculos }] = await Promise.all([
    supabaseServidor.from('cemiterios').select('slug').eq('parceiro_id', parceiroId).eq('publico', true),
    supabaseServidor
      .from('cemiterios_parceiros')
      .select('cemiterios(slug, publico)')
      .eq('parceiro_id', parceiroId)
      .eq('ativo', true),
  ])
  const slugs = new Set<string>()
  for (const c of diretos || []) if (c.slug) slugs.add(c.slug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of (vinculos || []) as any[]) {
    const c = Array.isArray(v.cemiterios) ? v.cemiterios[0] : v.cemiterios
    if (c?.slug && c.publico) slugs.add(c.slug)
  }
  return [...slugs]
}

function anos(nasc: string | null, falec: string | null): string | null {
  const a = nasc?.match(/(\d{4})/)?.[1]
  const b = falec?.match(/(\d{4})/)?.[1]
  return a && b ? `${a} — ${b}` : null
}

/**
 * Memorial mostrado como "assim fica a página da sua família".
 *
 * Sempre o registro fictício do sistema. Memorial real de uma família NUNCA
 * vira vitrine comercial aqui, mesmo sendo aberto -- a família autorizou a
 * página dela a existir, não a ser usada pra vender. (A versão antiga desta
 * página usava o memorial aberto mais recente do parceiro; saiu em 2026-10-09.)
 */
export async function carregarMemorialVitrine(): Promise<MemorialVitrine | null> {
  const { data } = await supabaseServidor
    .from('homenagens')
    .select('nome_completo, slug, foto_url, frase_preferida, cidade, data_nascimento, data_falecimento')
    .eq('slug', SLUG_EXEMPLO)
    .maybeSingle()
  if (!data?.slug) return null
  return {
    nome_completo: data.nome_completo,
    slug: data.slug,
    foto: urlMidiaProtegida(data.foto_url),
    frase_preferida: data.frase_preferida,
    cidade: data.cidade,
    anos: anos(data.data_nascimento, data.data_falecimento),
    ficticio: true,
  }
}
