import { createHmac, timingSafeEqual } from 'crypto'

const SEGREDO = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DURACAO_MS = 1000 * 60 * 60 * 12 // 12h

function assinar(payload: string) {
  return createHmac('sha256', SEGREDO).update(payload).digest('hex')
}

export function criarTokenFamilia(memorialId: string) {
  const payload = JSON.stringify({ memorialId, exp: Date.now() + DURACAO_MS })
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
      exp: number
    }
  } catch {
    return null
  }
}

export function verificarTokenFamilia(token: string | undefined | null, memorialId: string) {
  if (!token) return false
  const payload = decodificarToken(token)
  if (!payload) return false
  if (payload.memorialId !== memorialId) return false
  if (Date.now() > payload.exp) return false
  return true
}
