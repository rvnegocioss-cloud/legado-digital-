import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { identificarChamador } from '@/lib/autorizacaoEquipe'
import { gerarSlugUnico } from '@/lib/gerarSlug'
import { LIMITE_FRASE } from '@/lib/paginaParceiro'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Textos e contato da página do parceiro (tela "Minha página").
//
// Quem pode: staff (qualquer parceiro) ou o próprio parceiro (só o dele) --
// regra 22. O id do parceiro vem do corpo, mas é conferido contra
// parceiros_usuarios de quem está logado; mandar o id de outra empresa dá 403.
//
// Só escreve as colunas da página. Plano, pagamento, CNPJ e o contato interno
// do cadastro não passam por aqui.
//
// Logo e capa têm rota própria (/api/parceiro-pagina/imagem), porque precisam
// conferir o tamanho da imagem antes de gravar.

function limpo(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}

export async function POST(req: NextRequest) {
  const corpo = (await req.json()) as Record<string, unknown>
  const parceiroId = typeof corpo.parceiroId === 'string' ? corpo.parceiroId : ''
  if (!parceiroId) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const quem = await identificarChamador(req, supabaseAdmin)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!quem.ehStaff && !quem.parceiroIds.includes(parceiroId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: parceiro } = await supabaseAdmin
    .from('parceiros_b2b')
    .select('id, slug, nome_fantasia, razao_social')
    .eq('id', parceiroId)
    .maybeSingle()
  if (!parceiro) return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 })

  const mudancas: Record<string, unknown> = {
    descricao_publica: limpo(corpo.frase, LIMITE_FRASE),
    whatsapp_publico: limpo(corpo.whatsapp, 30),
    telefone_publico: limpo(corpo.telefone, 30),
    endereco_publico: limpo(corpo.endereco, 200),
    updated_at: new Date().toISOString(),
  }

  // Parceiro antigo pode não ter endereço de página ainda. Sem slug a página
  // não abre, então ele nasce aqui, no primeiro "Salvar".
  if (!parceiro.slug) {
    mudancas.slug = await gerarSlugUnico(
      supabaseAdmin,
      parceiro.nome_fantasia || parceiro.razao_social,
      parceiro.id,
      'parceiros_b2b'
    )
  }

  const { data, error } = await supabaseAdmin
    .from('parceiros_b2b')
    .update(mudancas)
    .eq('id', parceiroId)
    .select('slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slug: data.slug })
}
