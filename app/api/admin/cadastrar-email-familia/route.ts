import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { hashSenhaMemorial } from '@/lib/senhaMemorial'
import { enviarEmailSenhaFamilia } from '@/lib/enviarEmailSenhaFamilia'
import { registrarEmail } from '@/lib/emailLog'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function gerarSenhaSimples() {
  return randomBytes(4).toString('hex')
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { memorialId, email } = await req.json()
  if (!memorialId || !email) {
    return NextResponse.json({ error: 'memorialId e email obrigatórios' }, { status: 400 })
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug, nome_completo, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem || !homenagem.slug) {
    return NextResponse.json({ error: 'Memorial não encontrado ou sem slug' }, { status: 404 })
  }

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const parceiroIds = ((usuario as any)?.parceiros_usuarios || []).map((pu: any) => pu.parceiro_id)
  const ehDonoDoParceiro = homenagem.parceiro_id && parceiroIds.includes(homenagem.parceiro_id)

  if (!ehStaff && !ehDonoDoParceiro) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const senha = gerarSenhaSimples()
  const senhaHash = hashSenhaMemorial(memorialId, senha)

  const { error: upsertError } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(
      { homenagem_id: memorialId, senha_familia_hash: senhaHash, updated_at: new Date().toISOString() },
      { onConflict: 'homenagem_id', ignoreDuplicates: false }
    )
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  const { error: updateError } = await supabaseAdmin
    .from('homenagens')
    .update({ familia_email: email })
    .eq('id', memorialId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const url = `${req.nextUrl.origin}/familia/login`
  const resultado = await enviarEmailSenhaFamilia({
    destinatario: email,
    nomeCompleto: homenagem.nome_completo,
    slug: homenagem.slug,
    senha,
    url,
  })

  await registrarEmail(supabaseAdmin, {
    homenagemId: memorialId,
    tipo: 'senha_familia',
    destinatario: email,
    assunto: `Acesso ao memorial de ${homenagem.nome_completo}`,
    status: resultado.enviado ? 'enviado' : 'erro',
    erroMsg: resultado.enviado ? null : resultado.erro,
  })

  return NextResponse.json({ ok: true, emailEnviado: resultado.enviado, senha })
}
