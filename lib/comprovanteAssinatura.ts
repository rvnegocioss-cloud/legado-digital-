import { createHmac, timingSafeEqual } from 'crypto'

// Comprovante de quem assinou o Livro de Assinaturas.
//
// O problema: o Livro fica numa página pública, sem login. Um botão de
// "remover" solto ali deixaria qualquer visitante apagar a mensagem que outra
// pessoa deixou pro falecido -- o pior tipo de estrago possível nessa página,
// porque é irreversível e ninguém fica sabendo.
//
// A solução é a mesma de guarda-volumes: ao assinar, o servidor devolve uma
// ficha assinada por ele mesmo. Só quem tem a ficha daquela assinatura pode
// removê-la. A ficha fica no navegador de quem assinou; não é sessão, não
// identifica ninguém, e não serve pra mais nada.
//
// Sem validade: a pessoa pode ter assinado errado e voltar no dia seguinte pra
// corrigir. Quem modera de verdade (staff, parceiro) continua removendo
// qualquer uma pelos próprios painéis, por outro caminho.

const SEGREDO = process.env.SESSION_HMAC_SECRET!

export function criarComprovante(condolenciaId: string): string {
  return createHmac('sha256', SEGREDO).update(`assinatura:${condolenciaId}`).digest('hex')
}

export function verificarComprovante(condolenciaId: string, comprovante: string | null | undefined): boolean {
  if (!comprovante) return false

  const esperado = criarComprovante(condolenciaId)
  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(comprovante, 'utf8')

  // Comparação de tempo constante: comparar com === vazaria, pelo tempo de
  // resposta, quantos caracteres iniciais o palpite acertou.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
