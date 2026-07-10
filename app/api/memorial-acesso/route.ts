import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarSenhaMemorial } from '@/lib/senhaMemorial'
import { criarTokenAcessoMemorial } from '@/lib/acessoMemorialSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { memorialId, senha } = await req.json()
  if (!memorialId || !senha) {
    return NextResponse.json({ ok: false, error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_acesso_hash')
    .eq('homenagem_id', memorialId)
    .single()

  if (!seguranca?.senha_acesso_hash) {
    return NextResponse.json({ ok: false, error: 'Memorial não tem senha configurada' }, { status: 404 })
  }

  const senhaCorreta = verificarSenhaMemorial(memorialId, senha, seguranca.senha_acesso_hash)
  if (!senhaCorreta) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 })
  }

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('slug')
    .eq('id', memorialId)
    .single()

  const res = NextResponse.json({ ok: true, slug: homenagem?.slug })
  if (homenagem?.slug) {
    const token = criarTokenAcessoMemorial(memorialId)
    res.cookies.set(`mem_acesso_${homenagem.slug}`, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
  }
  return res
}
