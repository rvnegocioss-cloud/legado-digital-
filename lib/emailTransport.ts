import nodemailer from 'nodemailer'

export const REMETENTE = `Legado Digital <${process.env.SMTP_FROM || 'contato@legadodigital.net'}>`

let transporter: nodemailer.Transporter | null = null

/**
 * Envio via SMTP do Google Workspace. contato@legadodigital.net é um Grupo
 * (sem senha própria, não autentica) — a autenticação real é feita pelo
 * usuário técnico sistema@legadodigital.net (SMTP_USER/SMTP_PASSWORD),
 * com "Enviar como" contato@legadodigital.net configurado no Workspace,
 * então o destinatário sempre vê contato@ como remetente.
 */
export function getEmailTransporter() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!user || !pass) return null

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // porta 587 usa STARTTLS, não TLS direto
      auth: { user, pass },
    })
  }
  return transporter
}
