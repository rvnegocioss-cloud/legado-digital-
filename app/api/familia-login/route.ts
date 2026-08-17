import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarSenhaMemorial } from '@/lib/senhaMemorial'
import { criarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { slug, senha } = await req.json()
  if (!slug || !senha) {
    return NextResponse.json({ ok: false, error: 'Preencha a senha' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug')
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

  // Só a senha (decisão do Rafael, 2026-08-17): a senha JA chega por e-mail no
  // endereco cadastrado da familia, entao exigir o e-mail de novo na tela era
  // repetir o mesmo fator e travava familia que nao lembrava qual e-mail foi
  // cadastrado. Quem protege contra forca bruta aqui e o rate limit de login
  // do proxy.ts (3/min por IP em /api/familia-login).
  const senhaCorreta = verificarSenhaMemorial(homenagem.id, senha, seguranca.senha_familia_hash)

  if (!senhaCorreta) {
    return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 })
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
