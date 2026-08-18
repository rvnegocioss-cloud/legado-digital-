/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Quanto tempo sem sinal até considerar que a pessoa saiu. Curto de propósito:
// ninguém fecha aba direito, e travar por tempo indeterminado deixaria o
// memorial preso pra sempre.
const SEGUNDOS_ATE_EXPIRAR = 90

async function memorialPorSlug(supabaseAdmin: any, slug: string) {
  const { data } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('slug', slug)
    .single()
  return data as { id: string; parceiro_id: string | null } | null
}

// Entra na edição (ou renova a presença). Devolve quem mais está lá.
export async function POST(req: NextRequest) {
  const { slug, sessaoChave, papel, quem } = (await req.json()) as {
    slug?: string
    sessaoChave?: string
    papel?: string
    quem?: string
  }

  if (!slug || !sessaoChave) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const homenagem = await memorialPorSlug(supabaseAdmin, slug)
  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const { autorizado, comoFamilia } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const papelReal = comoFamilia ? 'familia' : papel === 'parceiro' ? 'parceiro' : 'staff'
  const agora = new Date().toISOString()

  await supabaseAdmin
    .from('memorial_edicao_sessoes')
    .upsert(
      { homenagem_id: homenagem.id, sessao_chave: sessaoChave, papel: papelReal, quem: quem || null, ultimo_sinal: agora },
      { onConflict: 'homenagem_id,sessao_chave' }
    )

  const limite = new Date(Date.now() - SEGUNDOS_ATE_EXPIRAR * 1000).toISOString()

  // Limpa presença morta antes de responder — senão o aviso ficaria preso
  // mostrando alguém que fechou o navegador ontem.
  await supabaseAdmin.from('memorial_edicao_sessoes').delete().lt('ultimo_sinal', limite)

  const { data: outros } = await supabaseAdmin
    .from('memorial_edicao_sessoes')
    .select('papel, quem, iniciado_em')
    .eq('homenagem_id', homenagem.id)
    .neq('sessao_chave', sessaoChave)
    .gte('ultimo_sinal', limite)
    .order('iniciado_em', { ascending: true })

  return NextResponse.json({
    ok: true,
    outros: (outros || []).map((o) => ({ papel: o.papel, quem: o.quem, desde: o.iniciado_em })),
  })
}

// Sai da edição (fechou a aba / clicou em sair).
export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const sessaoChave = req.nextUrl.searchParams.get('sessaoChave')
  if (!slug || !sessaoChave) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const homenagem = await memorialPorSlug(supabaseAdmin, slug)
  if (!homenagem) return NextResponse.json({ ok: true })

  const { autorizado } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await supabaseAdmin
    .from('memorial_edicao_sessoes')
    .delete()
    .eq('homenagem_id', homenagem.id)
    .eq('sessao_chave', sessaoChave)

  return NextResponse.json({ ok: true })
}
