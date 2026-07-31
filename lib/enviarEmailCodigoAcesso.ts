import { getEmailTransporter, REMETENTE } from './emailTransport'

export async function enviarEmailCodigoAcesso(dados: {
  destinatario: string
  nomeCompleto: string
  codigo: string
}) {
  const transporter = getEmailTransporter()
  if (!transporter) return { enviado: false, erro: 'SMTP não configurado' }

  try {
    await transporter.sendMail({
      from: REMETENTE,
      to: dados.destinatario,
      subject: `Código de acesso — memorial de ${dados.nomeCompleto}`,
      html: `
        <p>Alguém pediu acesso ao memorial de <strong>${dados.nomeCompleto}</strong> com esse e-mail.</p>
        <p style="font-size: 24px; letter-spacing: 4px; font-weight: bold;">${dados.codigo}</p>
        <p>Esse código vale por 10 minutos. Se você não pediu, pode ignorar esse e-mail.</p>
      `,
    })
    return { enviado: true }
  } catch (error) {
    return { enviado: false, erro: error instanceof Error ? error.message : 'Erro ao enviar e-mail' }
  }
}
