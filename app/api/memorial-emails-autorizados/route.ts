import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LIMITE_EMAILS = 200

async function carregarHomenagemEAutorizar(req: NextRequest, supabaseAdmin: any, memorialId: string) {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem) return { erro: 'Memorial não encontrado', status: 404 } as const

  const { autorizado } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) return { erro: 'Sem permissão', status: 403 } as const

  return { homenagem } as const
}

export async function GET(req: NextRequest) {
  const memorialId = req.nextUrl.searchParams.get('memorialId')
  if (!memorialId) return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await carregarHomenagemEAutorizar(req, supabaseAdmin, memorialId)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  const { data: emails } = await supabaseAdmin
    .from('homenagens_emails_autorizados')
    .select('id, email, criado_em')
    .eq('homenagem_id', memorialId)
    .order('criado_em', { ascending: false })

  return NextResponse.json({ emails: emails || [] })
}

export async function POST(req: NextRequest) {
  const { memorialId, email } = await req.json()
  const emailLimpo = (email || '').trim().toLowerCase()
  if (!memorialId || !EMAIL_REGEX.test(emailLimpo)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await carregarHomenagemEAutorizar(req, supabaseAdmin, memorialId)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  const { count } = await supabaseAdmin
    .from('homenagens_emails_autorizados')
    .select('*', { count: 'exact', head: true })
    .eq('homenagem_id', memorialId)
  if ((count ?? 0) >= LIMITE_EMAILS) {
    return NextResponse.json({ error: `Limite de ${LIMITE_EMAILS} e-mails por memorial atingido` }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('homenagens_emails_autorizados')
    .insert({ homenagem_id: memorialId, email: emailLimpo })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Esse e-mail já está na lista' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const memorialId = req.nextUrl.searchParams.get('memorialId')
  if (!id || !memorialId) return NextResponse.json({ error: 'id e memorialId obrigatórios' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await carregarHomenagemEAutorizar(req, supabaseAdmin, memorialId)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  await supabaseAdmin.from('homenagens_emails_autorizados').delete().eq('id', id).eq('homenagem_id', memorialId)
  return NextResponse.json({ ok: true })
}
