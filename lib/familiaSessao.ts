import { createHmac, timingSafeEqual } from 'crypto'

// Segredo próprio pra assinatura de sessão — antes reaproveitava a
// SUPABASE_SERVICE_ROLE_KEY, o que juntava dois domínios diferentes (a
// credencial de admin do banco e a assinatura de sessão da família) e
// significava que rotacionar a chave do Supabase por qualquer motivo
// derrubava toda sessão de família ativa de uma vez, sem forma de revogar
// uma sessão individual.
const SEGREDO = process.env.SESSION_HMAC_SECRET!
const DURACAO_MS = 1000 * 60 * 60 * 12 // 12h

function assinar(payload: string) {
  return createHmac('sha256', SEGREDO).update(payload).digest('hex')
}

// Pedaço do hash da senha vigente embutido no token — não é sobre o hash em
// si (o payload não sai do servidor pro fora do token, e o token já é
// assinado), é sobre revogação: trocar a senha muda o hash, então todo
// cookie emitido com o hash antigo para de bater na verificação na hora,
// mesmo dentro das 12h de validade. Sem isso, trocar senha (ex: "esqueci
// minha senha") não derrubava sessão nenhuma já aberta.
function fragmentoHash(hash: string | null | undefined) {
  return (hash || '').slice(0, 16)
}

export function criarTokenFamilia(memorialId: string, senhaFamiliaHashAtual: string | null | undefined) {
  const payload = JSON.stringify({
    memorialId,
    hashFrag: fragmentoHash(senhaFamiliaHashAtual),
    exp: Date.now() + DURACAO_MS,
  })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const assinatura = assinar(payloadB64)
  return `${payloadB64}.${assinatura}`
}

function decodificarToken(token: string) {
  const [payloadB64, assinatura] = token.split('.')
  if (!payloadB64 || !assinatura) return null

  const assinaturaEsperada = assinar(payloadB64)
  const a = Buffer.from(assinatura)
  const b = Buffer.from(assinaturaEsperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      memorialId: string
      hashFrag: string
      exp: number
    }
  } catch {
    return null
  }
}

export function verificarTokenFamilia(
  token: string | undefined | null,
  memorialId: string,
  senhaFamiliaHashAtual: string | null | undefined
) {
  if (!token) return false
  const payload = decodificarToken(token)
  if (!payload) return false
  if (payload.memorialId !== memorialId) return false
  if (Date.now() > payload.exp) return false
  if (payload.hashFrag !== fragmentoHash(senhaFamiliaHashAtual)) return false
  return true
}
