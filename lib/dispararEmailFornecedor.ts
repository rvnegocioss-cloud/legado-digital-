import { gerarQrCodePng } from '@/lib/qrcode'
import { enviarEmailQrCode } from '@/lib/enviarEmailQrCode'
import { registrarEmail } from '@/lib/emailLog'

export async function dispararEmailFornecedor(supabaseAdmin: any, memorialId: string, origin: string) {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug, nome_completo, mensagem_placa, qr_code_url')
    .eq('id', memorialId)
    .single()

  if (!homenagem || !homenagem.slug || !homenagem.qr_code_url) {
    return { enviado: false, motivo: 'sem_qrcode' as const }
  }

  const { data: config } = await supabaseAdmin
    .from('configuracoes_sistema')
    .select('valor')
    .eq('chave', 'email_fornecedor_placas')
    .maybeSingle()

  if (!config?.valor) {
    return { enviado: false, motivo: 'sem_email_fornecedor' as const }
  }

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('mensagem_placa_confirmada')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  const temMensagem = !!homenagem.mensagem_placa
  const confirmada = !!seguranca?.mensagem_placa_confirmada

  if (temMensagem && !confirmada) {
    await registrarEmail(supabaseAdmin, {
      homenagemId: memorialId,
      tipo: 'envio_fornecedor',
      destinatario: config.valor,
      assunto: `QR Code para produção — ${homenagem.nome_completo}`,
      status: 'erro',
      erroMsg: 'Aguardando confirmação da família sobre a mensagem da placa',
    })
    return { enviado: false, motivo: 'aguardando_confirmacao' as const }
  }

  const url = `${origin}/homenagem/${homenagem.slug}`
  const png = await gerarQrCodePng(url)

  const resultado = await enviarEmailQrCode({
    destinatario: config.valor,
    nomeCompleto: homenagem.nome_completo,
    memorialId,
    slug: homenagem.slug,
    url,
    qrCodePng: png,
    mensagemPlaca: homenagem.mensagem_placa,
  })

  await registrarEmail(supabaseAdmin, {
    homenagemId: memorialId,
    tipo: 'envio_fornecedor',
    destinatario: config.valor,
    assunto: `QR Code para produção — ${homenagem.nome_completo}`,
    status: resultado.enviado ? 'enviado' : 'erro',
    erroMsg: resultado.enviado ? null : resultado.erro,
  })

  return { enviado: resultado.enviado, motivo: 'ok' as const }
}
