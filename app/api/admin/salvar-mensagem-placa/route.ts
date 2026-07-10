import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailConfirmacaoPlaca } from '@/lib/enviarEmailConfirmacaoPlaca'
import { registrarEmail, gerarTokenConfirmacao } from '@/lib/emailLog'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { memorialId, mensagem } = await req.json()
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
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
    .select('id, nome_completo, familia_email, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
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

  const texto = (mensagem || '').trim()

  const { error: updateError } = await supabaseAdmin
    .from('homenagens')
    .update({ mensagem_placa: texto || null })
    .eq('id', memorialId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: segurancaError } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(
      {
        homenagem_id: memorialId,
        mensagem_placa_confirmada: false,
        mensagem_placa_confirmada_em: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'homenagem_id', ignoreDuplicates: false }
    )
  if (segurancaError) return NextResponse.json({ error: segurancaError.message }, { status: 500 })

  if (!texto) {
    return NextResponse.json({ ok: true, emailConfirmacaoEnviado: false })
  }

  if (!homenagem.familia_email) {
    return NextResponse.json({
      ok: true,
      emailConfirmacaoEnviado: false,
      aviso: 'Cadastre o e-mail da família antes pra poder confirmar a mensagem da placa.',
    })
  }

  const token = gerarTokenConfirmacao()
  const urlConfirmacao = `${req.nextUrl.origin}/confirmar-placa/${token}`

  const resultado = await enviarEmailConfirmacaoPlaca({
    destinatario: homenagem.familia_email,
    nomeCompleto: homenagem.nome_completo,
    mensagemPlaca: texto,
    urlConfirmacao,
  })

  await registrarEmail(supabaseAdmin, {
    homenagemId: memorialId,
    tipo: 'confirmacao_placa',
    destinatario: homenagem.familia_email,
    assunto: `Confirme o texto da placa — ${homenagem.nome_completo}`,
    status: resultado.enviado ? 'enviado' : 'erro',
    token,
    erroMsg: resultado.enviado ? null : resultado.erro,
  })

  return NextResponse.json({ ok: true, emailConfirmacaoEnviado: resultado.enviado })
}
