// "Clique pra conversar" oficial do próprio WhatsApp (wa.me) — abre o
// WhatsApp Web/app de quem já está logado, direto na conversa com o número
// certo. Não precisa de API nem conta nenhuma, não é integração de verdade
// (não traz mensagem recebida pra dentro do sistema) — só atalho.
export function linkWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (!digitos) return null
  const comCodigoPais = digitos.startsWith('55') ? digitos : `55${digitos}`
  return `https://wa.me/${comCodigoPais}`
}
