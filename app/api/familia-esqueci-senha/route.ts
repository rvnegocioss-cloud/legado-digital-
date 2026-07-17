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

// Sempre responde a mesma mensagem genérica, dê ou não certo por trás — não é
// pra dar pra ninguém adivinhar se um e-mail está cadastrado num memorial só
// tentando essa rota (mesmo princípio de qualquer "esqueci minha senha" público).
function respostaGenerica() {
  return NextResponse.json({
    ok: true,
    mensagem: 'Se o e-mail estiver certo, uma nova senha foi enviada.',
  })
}

export async function POST(req: NextRequest) {
  const { slug, email } = await req.json()
  if (!slug || !email) {
    return NextResponse.json({ error: 'Preencha o slug e o e-mail' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, nome_completo, familia_email')
    .eq('slug', slug)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const emailCadastrado = (homenagem.familia_email || '').trim().toLowerCase()
  const emailDigitado = String(email).trim().toLowerCase()

  if (!emailCadastrado || emailCadastrado !== emailDigitado) {
    return respostaGenerica()
  }

  const senha = gerarSenhaSimples()
  const senhaHash = hashSenhaMemorial(homenagem.id, senha)

  const { error: upsertError } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(
      { homenagem_id: homenagem.id, senha_familia_hash: senhaHash, updated_at: new Date().toISOString() },
      { onConflict: 'homenagem_id', ignoreDuplicates: false }
    )
  if (upsertError) return respostaGenerica()

  const url = `${req.nextUrl.origin}/familia/login`
  const resultado = await enviarEmailSenhaFamilia({
    destinatario: emailCadastrado,
    nomeCompleto: homenagem.nome_completo,
    slug,
    senha,
    url,
  })

  await registrarEmail(supabaseAdmin, {
    homenagemId: homenagem.id,
    tipo: 'senha_familia',
    destinatario: emailCadastrado,
    assunto: `Nova senha do memorial de ${homenagem.nome_completo}`,
    status: resultado.enviado ? 'enviado' : 'erro',
    erroMsg: resultado.enviado ? null : resultado.erro,
  })

  return respostaGenerica()
}
