import { getEmailTransporter, REMETENTE } from './emailTransport'

export async function enviarEmailSenhaFamilia(dados: {
  destinatario: string
  nomeCompleto: string
  slug: string
  senha: string
  url: string
}) {
  const transporter = getEmailTransporter()
  if (!transporter) return { enviado: false, erro: 'SMTP não configurado' }

  try {
    await transporter.sendMail({
      from: REMETENTE,
      to: dados.destinatario,
      subject: `Acesso ao memorial de ${dados.nomeCompleto}`,
      html: `
        <p>Você foi cadastrado como família responsável pelo memorial de <strong>${dados.nomeCompleto}</strong>.</p>
        <p>
          <strong>Senha de acesso:</strong> ${dados.senha}
        </p>
        <p>
          Pra adicionar fotos, vídeo e a história, acesse <a href="${dados.url}">${dados.url}</a>,
          busque pelo nome do homenageado e use essa senha.
        </p>
      `,
    })
    return { enviado: true }
  } catch (error) {
    return { enviado: false, erro: error instanceof Error ? error.message : 'Erro ao enviar e-mail' }
  }
}
