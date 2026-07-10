import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()
  if (!email || !senha) {
    return NextResponse.json({ ok: false, error: 'Preencha e-mail e senha' }, { status: 400 })
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password: senha })
  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: 'E-mail ou senha incorretos' }, { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: responsavel } = await admin
    .from('responsaveis_familiares')
    .select('homenagem_id, homenagens(slug)')
    .eq('usuario_id', data.user.id)
    .limit(1)
    .maybeSingle()

  if (!responsavel) {
    return NextResponse.json({ ok: false, error: 'Essa conta não é responsável por nenhum memorial' }, { status: 403 })
  }

  const slug = (responsavel as any).homenagens?.slug
  const token = criarTokenFamilia(responsavel.homenagem_id, true)
  const res = NextResponse.json({ ok: true, slug })
  res.cookies.set(`familia_${responsavel.homenagem_id}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  })
  return res
}
