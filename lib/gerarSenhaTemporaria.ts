import { randomInt } from 'crypto'

/**
 * Senha temporária do primeiro acesso do parceiro.
 *
 * Histórico: era fixa "123456" pra todo mundo; virou "2 letras do nome + 6
 * dígitos" (8 caracteres). O Supabase Auth passou a exigir no mínimo 10, então
 * todo convite quebrava com "Password should be at least 10 characters" — o
 * contato era salvo mas ficava sem login, silenciosamente do ponto de vista de
 * quem cadastrou.
 *
 * Agora tem folga sobre esse mínimo: se a política do Auth subir de novo, não
 * quebra na cara do usuário. O parceiro é obrigado a trocar no primeiro login
 * (app/parceiro/layout.tsx), então isso é só o passe de entrada.
 */

// Mínimo do Supabase hoje é 10. Com folga, pra aguentar um aperto futuro
// da política sem quebrar o convite.
const TAMANHO_ALEATORIO = 10

// Sem 0/O/1/l/I: a senha é ditada por telefone ou copiada de e-mail, e esses
// caracteres se confundem em quase toda fonte. Mesmo critério da senha de
// visita que a família gera.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function gerarSenhaTemporaria(nomeParceiro: string): string {
  let prefixo = nomeParceiro
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g'), '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 2)

  if (prefixo.length < 2) prefixo = (prefixo + 'xy').slice(0, 2)

  let sorteio = ''
  for (let i = 0; i < TAMANHO_ALEATORIO; i++) {
    sorteio += ALFABETO[randomInt(0, ALFABETO.length)]
  }

  // 2 + 10 = 12 caracteres
  return prefixo + sorteio
}
