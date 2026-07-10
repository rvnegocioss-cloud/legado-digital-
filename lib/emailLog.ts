import { randomBytes } from 'crypto'

export type TipoEmail = 'senha_familia' | 'confirmacao_placa' | 'envio_fornecedor'

export function gerarTokenConfirmacao() {
  return randomBytes(24).toString('hex')
}

export async function registrarEmail(
  supabaseAdmin: any,
  dados: {
    homenagemId: string
    tipo: TipoEmail
    destinatario: string
    assunto: string
    status?: 'enviado' | 'erro'
    token?: string | null
    erroMsg?: string | null
  }
) {
  await supabaseAdmin.from('emails_enviados').insert({
    homenagem_id: dados.homenagemId,
    tipo: dados.tipo,
    destinatario: dados.destinatario,
    assunto: dados.assunto,
    status: dados.status || 'enviado',
    token: dados.token || null,
    erro_msg: dados.erroMsg || null,
  })
}
