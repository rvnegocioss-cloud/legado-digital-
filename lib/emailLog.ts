import { randomBytes } from 'crypto'

export type TipoEmail =
  | 'senha_familia'
  | 'confirmacao_placa'
  | 'envio_fornecedor'
  | 'convite_parceiro'
  | 'codigo_acesso_memorial'

// Fonte única do rótulo em português de cada tipo -- reaproveitado pelo
// histórico (/admin/emails) e pelo sino de alertas do header (admin/layout.tsx),
// pra não desalinhar os dois quando um tipo novo entrar.
export const TIPO_EMAIL_LABEL: Record<TipoEmail, string> = {
  senha_familia: 'Senha da família',
  confirmacao_placa: 'Confirmação de placa',
  envio_fornecedor: 'Envio ao fornecedor',
  convite_parceiro: 'Convite de acesso (parceiro)',
  codigo_acesso_memorial: 'Código de acesso (visitante)',
}

// `tipo` chega como string solta do banco (não o union type) em quem lê a
// tabela -- helper cobre tipo desconhecido caindo no texto cru em vez de
// quebrar o index type.
export function rotuloTipoEmail(tipo: string): string {
  return TIPO_EMAIL_LABEL[tipo as TipoEmail] || tipo
}

export function gerarTokenConfirmacao() {
  return randomBytes(24).toString('hex')
}

export async function registrarEmail(
  supabaseAdmin: any,
  dados: {
    homenagemId?: string | null
    tipo: TipoEmail
    destinatario: string
    assunto: string
    status?: 'enviado' | 'erro'
    token?: string | null
    erroMsg?: string | null
  }
) {
  await supabaseAdmin.from('emails_enviados').insert({
    homenagem_id: dados.homenagemId || null,
    tipo: dados.tipo,
    destinatario: dados.destinatario,
    assunto: dados.assunto,
    status: dados.status || 'enviado',
    token: dados.token || null,
    erro_msg: dados.erroMsg || null,
  })
}
