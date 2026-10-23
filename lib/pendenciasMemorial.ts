import { supabase } from '@/lib/auth'

// Fonte única do cálculo de "o que falta" num memorial. Usada pela aba
// Pendências da Central de Comunicações (e, depois, pelo Dashboard e pelo sino).
// Regra: memorial "Ilustre" (figura_publica) não cobra data de falecimento nem
// contato da família; rascunho ('rascunho-' no slug ou nome 'Novo memorial')
// não entra.

export const TIPOS_FALTA = ['contato da família', 'data de falecimento', 'foto', 'história'] as const
export type TipoFalta = (typeof TIPOS_FALTA)[number]

export type OrigemMemorial = 'cemiterio' | 'parceiro' | 'central' | 'outra'

export interface MemorialParaPendencia {
  id: string
  slug?: string | null
  nome_completo: string | null
  data_falecimento: string | null
  foto_url: string | null
  biografia: string | null
  familia_email: string | null
  preenchido_por: string | null
  origem_cadastro: string | null
  figura_publica: boolean | null
  parceiro_id: string | null
  created_at: string
}

export interface MemorialPendente {
  id: string
  nome_completo: string
  parceiro_id: string | null
  figura_publica: boolean
  quem: 'familia' | 'equipe'
  origem: OrigemMemorial
  created_at: string
  dias: number
  falta: TipoFalta[]
}

export function ehRascunho(m: Pick<MemorialParaPendencia, 'slug' | 'nome_completo'>) {
  const nome = (m.nome_completo || '').trim()
  return (m.slug || '').startsWith('rascunho-') || nome === '' || nome === 'Novo memorial'
}

export function calcularFalta(
  m: Pick<MemorialParaPendencia, 'data_falecimento' | 'foto_url' | 'biografia' | 'familia_email' | 'figura_publica'>
): TipoFalta[] {
  const falta: TipoFalta[] = []
  if (!m.data_falecimento && !m.figura_publica) falta.push('data de falecimento')
  if (!m.foto_url) falta.push('foto')
  if (!m.biografia) falta.push('história')
  if (!m.familia_email && !m.figura_publica) falta.push('contato da família')
  return falta
}

export function origemDe(origem: string | null): OrigemMemorial {
  if (origem === 'mapa_cemiterio') return 'cemiterio'
  if (origem === 'parceiro') return 'parceiro'
  if (origem === 'central') return 'central'
  return 'outra'
}

export function diasDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

export function montarPendencia(m: MemorialParaPendencia): MemorialPendente | null {
  if (ehRascunho(m)) return null
  const falta = calcularFalta(m)
  if (falta.length === 0) return null
  return {
    id: m.id,
    nome_completo: (m.nome_completo || '').trim(),
    parceiro_id: m.parceiro_id,
    figura_publica: !!m.figura_publica,
    quem: m.preenchido_por === 'familia' ? 'familia' : 'equipe',
    origem: origemDe(m.origem_cadastro),
    created_at: m.created_at,
    dias: diasDesde(m.created_at),
    falta,
  }
}

const LOTE = 1000

// Lê todos os memoriais em lotes de 1000 (teto do PostgREST) até acabar, em
// vez do limit(200) antigo, e devolve só os que têm algo faltando.
export async function carregarPendencias(): Promise<MemorialPendente[]> {
  const todos: MemorialPendente[] = []
  for (let de = 0; ; de += LOTE) {
    const { data, error } = await supabase
      .from('homenagens')
      .select(
        'id, slug, nome_completo, data_falecimento, foto_url, biografia, familia_email, preenchido_por, origem_cadastro, figura_publica, parceiro_id, created_at'
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(de, de + LOTE - 1)
    if (error) {
      console.error('Pendências: erro ao ler memoriais', error.message)
      break
    }
    const lote = (data || []) as MemorialParaPendencia[]
    for (const m of lote) {
      const p = montarPendencia(m)
      if (p) todos.push(p)
    }
    if (lote.length < LOTE) break
  }
  return todos
}
