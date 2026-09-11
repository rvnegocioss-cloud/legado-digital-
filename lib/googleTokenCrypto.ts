import { createHash, createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto'

// Criptografa o token de acesso ao Google (Gmail/Calendar/Drive) antes de
// gravar em google_tokens -- sem isso, quem tivesse acesso direto ao banco
// leria o token de e-mail de qualquer staff em texto puro. RLS já impede
// leitura normal (regra 22 ampliada), isso é a camada de baixo, pra quando
// a de cima falhar.
//
// A chave NÃO é o SESSION_HMAC_SECRET puro -- é derivada dele via HKDF com
// um rótulo próprio ("google-tokens-v1"), que é exatamente pra isso que HKDF
// existe: tirar várias chaves independentes de um segredo só, sem reusar o
// mesmo material criptográfico pra dois algoritmos diferentes (o HMAC_SECRET
// já assina cookie de sessão em 4 lugares do projeto). Assim não precisa de
// variável de ambiente nova na Vercel pra isso funcionar.
const SEGREDO_BASE = process.env.SESSION_HMAC_SECRET!

function chaveDerivada(): Buffer {
  const derivado = hkdfSync('sha256', SEGREDO_BASE, '', 'google-tokens-v1', 32)
  return Buffer.from(derivado)
}

export function criptografarToken(textoPlano: string): string {
  const iv = randomBytes(12) // GCM padrão: 12 bytes
  const cifra = createCipheriv('aes-256-gcm', chaveDerivada(), iv)
  const cifrado = Buffer.concat([cifra.update(textoPlano, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()
  // iv + tag + cifrado, tudo junto em base64 -- um campo texto só, sem
  // mudar o formato da coluna no banco.
  return Buffer.concat([iv, tag, cifrado]).toString('base64')
}

export function descriptografarToken(valorCriptografado: string): string {
  const dados = Buffer.from(valorCriptografado, 'base64')
  const iv = dados.subarray(0, 12)
  const tag = dados.subarray(12, 28)
  const cifrado = dados.subarray(28)
  const decifra = createDecipheriv('aes-256-gcm', chaveDerivada(), iv)
  decifra.setAuthTag(tag)
  return Buffer.concat([decifra.update(cifrado), decifra.final()]).toString('utf8')
}

// Só pra debug/log seguro -- nunca logar o token inteiro nem o criptografado
// completo, só um hash curto pra conferir "é o mesmo token de antes?" sem
// expor nada reversível.
export function fingerprintToken(textoPlano: string): string {
  return createHash('sha256').update(textoPlano).digest('hex').slice(0, 12)
}
