import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { hashSenhaMemorial } from '@/lib/senhaMemorial'
import { enviarEmailCodigoAcesso } from '@/lib/enviarEmailCodigoAcesso'
import { registrarEmail } from '@/lib/emailLog'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESPOSTA_GENERICA = {
  ok: true,
  mensagem: 'Se esse e-mail estiver autorizado, o código chega em instantes.',
}

export async function POST(req: NextRequest) {
  const { memorialId, email } = await req.json()
  const emailLimpo = (email || '').trim().toLowerCase()
  if (!memorialId || !EMAIL_REGEX.test(emailLimpo)) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, nome_completo')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem) return NextResponse.json(RESPOSTA_GENERICA)

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('modo_gate')
    .eq('homenagem_id', memorialId)
    .maybeSingle()
  if ((seguranca?.modo_gate ?? 'aberto') !== 'email') return NextResponse.json(RESPOSTA_GENERICA)

  // Rate limit no banco, não em memória -- o Map de proxy.ts não é
  // compartilhado entre instâncias serverless da Vercel, e OTP não pode
  // depender de sorte de roteamento pra travar spam de e-mail.
  const umaHoraAtras = new Date(Date.now() - 3600000).toISOString()
  const [{ count: countMemorial }, { count: countEmail }] = await Promise.all([
    supabaseAdmin
      .from('memorial_email_codigos')
      .select('*', { count: 'exact', head: true })
      .eq('homenagem_id', memorialId)
      .gte('criado_em', umaHoraAtras),
    supabaseAdmin
      .from('memorial_email_codigos')
      .select('*', { count: 'exact', head: true })
      .eq('email', emailLimpo)
      .gte('criado_em', umaHoraAtras),
  ])
  if ((countMemorial ?? 0) >= 10 || (countEmail ?? 0) >= 3) {
    // Mesma resposta genérica -- não denuncia rate limit pra quem tenta enumerar.
    return NextResponse.json(RESPOSTA_GENERICA)
  }

  const { data: autorizado } = await supabaseAdmin
    .from('homenagens_emails_autorizados')
    .select('id')
    .eq('homenagem_id', memorialId)
    .eq('email', emailLimpo)
    .maybeSingle()

  if (autorizado) {
    const codigo = String(randomInt(100000, 1000000))
    const codigoHash = hashSenhaMemorial(memorialId, codigo)
    await supabaseAdmin.from('memorial_email_codigos').insert({
      homenagem_id: memorialId,
      email: emailLimpo,
      codigo_hash: codigoHash,
      expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    const resultado = await enviarEmailCodigoAcesso({
      destinatario: emailLimpo,
      nomeCompleto: homenagem.nome_completo,
      codigo,
    })
    await registrarEmail(supabaseAdmin, {
      homenagemId: memorialId,
      tipo: 'codigo_acesso_memorial',
      destinatario: emailLimpo,
      assunto: `Código de acesso — memorial de ${homenagem.nome_completo}`,
      status: resultado.enviado ? 'enviado' : 'erro',
      erroMsg: resultado.enviado ? null : resultado.erro,
    })
  }

  // Sempre a mesma resposta, autorizado ou não -- mesmo padrão anti-enumeração
  // já usado em /api/familia-esqueci-senha.
  return NextResponse.json(RESPOSTA_GENERICA)
}
