import { createHmac, timingSafeEqual } from 'crypto'

// Mesmo motivo do lib/familiaSessao.ts: segredo próprio em vez de
// reaproveitar a SUPABASE_SERVICE_ROLE_KEY (dois domínios diferentes).
const SEGREDO = process.env.SESSION_HMAC_SECRET!
const DURACAO_MS = 1000 * 60 * 60 * 24 * 30 // 30 dias

function assinar(payload: string) {
  return createHmac('sha256', SEGREDO).update(payload).digest('hex')
}

// gateVersao entra no payload pra revogar cookie na hora quando a
// privacidade muda (troca de modo, define/tira senha) — mesmo dentro dos
// 30 dias de validade. modo entra pra o cookie de um portão não liberar
// outro (ex: cookie emitido em modo 'senha' não vale se o modo virou
// 'email' depois, mesmo com gateVersao igual por coincidência).
const DURACAO_MS_POR_MODO: Record<string, number> = {
  senha: 1000 * 60 * 60 * 24 * 30, // 30 dias
  cadastro: 1000 * 60 * 60 * 24 * 7, // 7 dias
  email: 1000 * 60 * 60 * 24 * 7, // 7 dias
}

export function criarTokenAcessoMemorial(memorialId: string, modo: string, gateVersao: number) {
  const duracao = DURACAO_MS_POR_MODO[modo] ?? DURACAO_MS
  const payload = JSON.stringify({ memorialId, modo, gateVersao, exp: Date.now() + duracao })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  return `${payloadB64}.${assinar(payloadB64)}`
}

export function verificarTokenAcessoMemorial(
  token: string | undefined | null,
  memorialId: string,
  modoAtual: string,
  gateVersaoAtual: number
) {
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
      modo: string
      gateVersao: number
      exp: number
    }
    return (
      payload.memorialId === memorialId &&
      payload.modo === modoAtual &&
      payload.gateVersao === gateVersaoAtual &&
      payload.exp > Date.now()
    )
  } catch {
    return false
  }
}

// Token do QR Code: determinístico (mesmo QR pra sempre, sem rotação —
// senão toda placa física já impressa quebraria a cada regeneração) e sem
// expiração própria. Só prova "isso veio de um QR de verdade", não prova
// identidade nem substitui os gates de senha/cadastro/email.
function assinarQr(memorialId: string) {
  return createHmac('sha256', SEGREDO).update(`qr:${memorialId}`).digest('hex').slice(0, 16)
}

export function criarTokenQr(memorialId: string) {
  return assinarQr(memorialId)
}

export function verificarTokenQr(token: string | undefined | null, memorialId: string) {
  if (!token) return false
  const esperado = assinarQr(memorialId)
  const a = Buffer.from(token)
  const b = Buffer.from(esperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
