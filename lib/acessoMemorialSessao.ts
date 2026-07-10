import { createHmac, timingSafeEqual } from 'crypto'

const SEGREDO = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DURACAO_MS = 1000 * 60 * 60 * 24 * 30 // 30 dias

function assinar(payload: string) {
  return createHmac('sha256', SEGREDO).update(payload).digest('hex')
}

export function criarTokenAcessoMemorial(memorialId: string) {
  const payload = JSON.stringify({ memorialId, exp: Date.now() + DURACAO_MS })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  return `${payloadB64}.${assinar(payloadB64)}`
}

export function verificarTokenAcessoMemorial(token: string | undefined | null, memorialId: string) {
  if (!token) return false
  const [payloadB64, assinatura] = token.split('.')
  if (!payloadB64 || !assinatura) return false

  const esperada = assinar(payloadB64)
  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      memorialId: string
      exp: number
    }
    return payload.memorialId === memorialId && payload.exp > Date.now()
  } catch {
    return false
  }
}
