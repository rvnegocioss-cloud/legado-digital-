import { scryptSync, timingSafeEqual } from 'crypto'

export function hashSenhaMemorial(memorialId: string, senha: string) {
  return scryptSync(senha, memorialId, 64).toString('hex')
}

export function verificarSenhaMemorial(memorialId: string, senha: string, hashSalvo: string) {
  const hashTentativa = Buffer.from(hashSenhaMemorial(memorialId, senha), 'hex')
  const hashArmazenado = Buffer.from(hashSalvo, 'hex')
  if (hashTentativa.length !== hashArmazenado.length) return false
  return timingSafeEqual(hashTentativa, hashArmazenado)
}
