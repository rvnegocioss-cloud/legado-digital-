import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarSenhaMemorial } from '@/lib/senhaMemorial'
import { criarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { slug, email, senha } = await req.json()
  if (!slug || !email || !senha) {
    return NextResponse.json({ ok: false, error: 'Preencha o e-mail e a senha' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug, familia_email')
    .eq('slug', slug)
    .single()

  if (!homenagem) {
    return NextResponse.json({ ok: false, error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .single()

  if (!seguranca?.senha_familia_hash) {
    return NextResponse.json({ ok: false, error: 'Este memorial ainda não tem acesso de família configurado' }, { status: 404 })
  }

  // E-mail junto da senha (2 fatores) — senha sozinha tem só 32 bits de
  // entropia (randomBytes(4)), curta demais pra ser o único fator. Sempre
  // roda os dois checks (não retorna cedo no e-mail) e devolve erro
  // genérico, pra não virar oráculo de "esse e-mail existe nesse memorial".
  const emailConfere =
    !!homenagem.familia_email && email.trim().toLowerCase() === homenagem.familia_email.trim().toLowerCase()
  const senhaCorreta = verificarSenhaMemorial(homenagem.id, senha, seguranca.senha_familia_hash)

  if (!emailConfere || !senhaCorreta) {
    return NextResponse.json({ ok: false, error: 'E-mail ou senha incorretos' }, { status: 401 })
  }

  const token = criarTokenFamilia(homenagem.id, seguranca.senha_familia_hash)
  const res = NextResponse.json({ ok: true, slug: homenagem.slug })
  res.cookies.set(`familia_${homenagem.id}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 12,
    path: '/',
  })
  return res
}
