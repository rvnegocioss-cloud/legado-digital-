import { randomInt } from 'crypto'

// Senha fixa "123456" pra todo mundo era previsível e igual pra qualquer
// parceiro. Gera uma por parceiro: 2 primeiras letras do nome (sem acento)
// + 6 dígitos aleatórios — só temporária, o parceiro é obrigado a trocar
// no primeiro login (ver app/parceiro/layout.tsx).
export function gerarSenhaTemporaria(nomeParceiro: string): string {
  let prefixo = nomeParceiro
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 2)

  if (prefixo.length < 2) prefixo = (prefixo + 'xy').slice(0, 2)

  const digitos = String(randomInt(0, 1_000_000)).padStart(6, '0')
  return prefixo + digitos
}
