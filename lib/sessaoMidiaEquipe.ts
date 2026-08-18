import { createHmac, timingSafeEqual } from 'crypto'

// Tag <img> não manda cabeçalho de autenticação. Então, pra Central e o Portal
// do Parceiro conseguirem ver a mídia de um memorial PROTEGIDO (senha, lista de
// e-mails, oculto), a página troca a credencial dela por um cookie curto e
// assinado, que o navegador manda junto de cada imagem.
//
// É só um passe de leitura de mídia: não dá acesso a nada além do que a pessoa
// já podia ver pelo painel, e expira sozinho.

const SEGREDO = process.env.SESSION_HMAC_SECRET!
const DURACAO_MS = 1000 * 60 * 60 * 8
export const COOKIE_MIDIA_EQUIPE = 'midia_equipe'

function assinar(payload: string) {
  return createHmac('sha256', SEGREDO).update(payload).digest('hex')
}

export function criarPasseMidiaEquipe(usuarioId: string) {
  const payload = Buffer.from(JSON.stringify({ usuarioId, exp: Date.now() + DURACAO_MS })).toString('base64url')
  return `${payload}.${assinar(payload)}`
}

export function verificarPasseMidiaEquipe(token: string | undefined | null) {
  if (!token) return false
  const [payload, assinatura] = token.split('.')
  if (!payload || !assinatura) return false
  const esperada = Buffer.from(assinar(payload))
  const recebida = Buffer.from(assinatura)
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return false
  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: number }
    return Date.now() < dados.exp
  } catch {
    return false
  }
}
