import { getEmailTransporter, REMETENTE } from './emailTransport'

export async function enviarEmailConviteParceiro(dados: {
  destinatario: string
  nome: string
  senhaTemporaria: string
}) {
  const transporter = getEmailTransporter()
  if (!transporter) return { enviado: false, erro: 'SMTP não configurado' }

  try {
    await transporter.sendMail({
      from: REMETENTE,
      to: dados.destinatario,
      subject: 'Acesso ao Portal do Parceiro — Legado Digital',
      html: `
        <p>Olá${dados.nome ? `, ${dados.nome}` : ''}! Você foi cadastrado como parceiro no Legado Digital.</p>
        <p>
          <strong>E-mail de acesso:</strong> ${dados.destinatario}<br/>
          <strong>Senha temporária:</strong> ${dados.senhaTemporaria}
        </p>
        <p>
          Acesse <a href="https://legado-digital-two.vercel.app/parceiro/login">o Portal do Parceiro</a>
          com esses dados. Recomendamos trocar a senha assim que entrar.
        </p>
      `,
    })
    return { enviado: true }
  } catch (error) {
    return { enviado: false, erro: error instanceof Error ? error.message : 'Erro ao enviar e-mail' }
  }
}
