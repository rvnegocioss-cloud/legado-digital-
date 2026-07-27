import { getEmailTransporter, REMETENTE } from './emailTransport'

function escapeHtml(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function enviarEmailConfirmacaoPlaca(dados: {
  destinatario: string
  nomeCompleto: string
  mensagemPlaca: string
  urlConfirmacao: string
}) {
  const transporter = getEmailTransporter()
  if (!transporter) return { enviado: false, erro: 'SMTP não configurado' }

  try {
    await transporter.sendMail({
      from: REMETENTE,
      to: dados.destinatario,
      subject: `Confirme o texto da placa — ${dados.nomeCompleto}`,
      html: `
        <p>Confira o texto que vai ser gravado na placa do memorial de <strong>${dados.nomeCompleto}</strong>:</p>
        <p style="padding:12px 16px; background:#f3f3f3; border-radius:8px;">
          ${escapeHtml(dados.mensagemPlaca).replace(/\n/g, '<br/>')}
        </p>
        <p>Se estiver tudo certo, confirme clicando no link abaixo. A placa só é enviada pra
        confecção depois dessa confirmação.</p>
        <p><a href="${dados.urlConfirmacao}">Confirmar texto da placa</a></p>
      `,
    })
    return { enviado: true }
  } catch (error) {
    return { enviado: false, erro: error instanceof Error ? error.message : 'Erro ao enviar e-mail' }
  }
}
