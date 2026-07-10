import { Resend } from 'resend'

export async function enviarEmailSenhaFamilia(dados: {
  destinatario: string
  nomeCompleto: string
  slug: string
  senha: string
  url: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { enviado: false, erro: 'RESEND_API_KEY não configurada' }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'Legado Digital <onboarding@resend.dev>',
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

  if (error) return { enviado: false, erro: error.message }
  return { enviado: true }
}
