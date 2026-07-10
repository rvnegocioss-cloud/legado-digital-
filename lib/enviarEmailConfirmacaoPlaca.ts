import { Resend } from 'resend'

function escapeHtml(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function enviarEmailConfirmacaoPlaca(dados: {
  destinatario: string
  nomeCompleto: string
  mensagemPlaca: string
  urlConfirmacao: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { enviado: false, erro: 'RESEND_API_KEY não configurada' }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'Legado Digital <onboarding@resend.dev>',
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

  if (error) return { enviado: false, erro: error.message }
  return { enviado: true }
}
