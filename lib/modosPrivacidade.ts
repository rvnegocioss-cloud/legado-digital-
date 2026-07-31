export type ModoGate = 'aberto' | 'senha' | 'cadastro' | 'email' | 'oculto'
export type CanalAcesso = 'link' | 'qr' | 'busca'

export type ResultadoGate =
  | { tipo: 'liberado' }
  | { tipo: 'nao_encontrado' } // oculto ou canal desligado — mesma resposta de slug inexistente
  | { tipo: 'portao'; modo: 'senha' | 'cadastro' | 'email' }

// Eixo A (canal: busca/link/QR) e eixo B (portão: modo_gate) são
// ortogonais — um não substitui o outro. Precedência fixa:
// 1. oculto vence tudo (mesmo cookie válido)
// 2. canal errado = não encontrado (nunca "acesso restrito", anti-enumeração)
// 3. portão aberto passa; senha/cadastro/email pedem prova
export function resolverAcesso(input: {
  modoGate: ModoGate
  buscaHabilitada: boolean
  linkHabilitado: boolean
  qrcodeHabilitado: boolean
  canal: CanalAcesso
  cookieValido: boolean
}): ResultadoGate {
  const { modoGate, linkHabilitado, qrcodeHabilitado, canal, cookieValido } = input

  if (modoGate === 'oculto') return { tipo: 'nao_encontrado' }

  const canalLiberado = canal === 'qr' ? qrcodeHabilitado : linkHabilitado
  if (canal !== 'busca' && !canalLiberado) return { tipo: 'nao_encontrado' }

  if (modoGate === 'aberto') return { tipo: 'liberado' }
  if (cookieValido) return { tipo: 'liberado' }

  return { tipo: 'portao', modo: modoGate }
}

export const ROTULOS_MODO: Record<ModoGate, { titulo: string; descricao: string }> = {
  aberto: {
    titulo: 'Aberto',
    descricao: 'Qualquer pessoa com acesso liberado pelos canais abaixo entra direto, sem pedir nada.',
  },
  senha: {
    titulo: 'Com senha',
    descricao: 'Pede uma senha antes de entrar. A família ou a funerária define a senha.',
  },
  cadastro: {
    titulo: 'Com identificação',
    descricao: 'Pede nome e e-mail antes de entrar — sem verificação, é só um registro de quem visitou. Não é controle de acesso de verdade.',
  },
  email: {
    titulo: 'Lista de e-mails autorizados',
    descricao: 'Só quem estiver numa lista de e-mails definida pela família consegue entrar, confirmando com um código enviado por e-mail.',
  },
  oculto: {
    titulo: 'Oculto',
    descricao: 'Ninguém acessa — some da busca, do link direto e do QR Code. Só staff, o parceiro dono e a família continuam vendo pelos próprios painéis.',
  },
}
