import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarSenhaMemorial } from '@/lib/senhaMemorial'
import { criarTokenAcessoMemorial } from '@/lib/acessoMemorialSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ERRO_GENERICO = 'Código inválido ou expirado.'

export async function POST(req: NextRequest) {
  const { memorialId, email, codigo } = await req.json()
  const emailLimpo = (email || '').trim().toLowerCase()
  if (!memorialId || !emailLimpo || !codigo) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem?.slug) return NextResponse.json({ error: ERRO_GENERICO }, { status: 401 })

  const { data: pendente } = await supabaseAdmin
    .from('memorial_email_codigos')
    .select('id, codigo_hash, expira_em, usado, tentativas')
    .eq('homenagem_id', memorialId)
    .eq('email', emailLimpo)
    .eq('usado', false)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pendente) return NextResponse.json({ error: ERRO_GENERICO }, { status: 401 })

  if (pendente.tentativas >= 5) {
    await supabaseAdmin.from('memorial_email_codigos').update({ usado: true }).eq('id', pendente.id)
    return NextResponse.json({ error: ERRO_GENERICO }, { status: 401 })
  }

  const correto = verificarSenhaMemorial(memorialId, String(codigo).trim(), pendente.codigo_hash)
  if (!correto) {
    await supabaseAdmin
      .from('memorial_email_codigos')
      .update({ tentativas: pendente.tentativas + 1 })
      .eq('id', pendente.id)
    return NextResponse.json({ error: ERRO_GENERICO }, { status: 401 })
  }

  await supabaseAdmin.from('memorial_email_codigos').update({ usado: true }).eq('id', pendente.id)

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('gate_versao')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  const token = criarTokenAcessoMemorial(memorialId, 'email', seguranca?.gate_versao ?? 1)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(`mem_acesso_${homenagem.slug}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
