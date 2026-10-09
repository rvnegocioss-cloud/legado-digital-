// Regras da página do parceiro (página pública + apresentação guiada).
//
// Fonte única: a tela "Minha página" do Portal do Parceiro mostra estes números
// no rótulo de cada campo, o navegador confere antes de enviar e a rota
// /api/parceiro-pagina/imagem confere de novo no servidor, lendo o arquivo que
// chegou no Storage. Mudou aqui, muda nos três lugares.

export type TipoImagemParceiro = 'logo' | 'capa'

export interface RegraImagem {
  rotulo: string
  coluna: 'logo_url' | 'capa_url'
  larguraMinima: number
  alturaMinima: number
  larguraIdeal: number
  alturaIdeal: number
  /** largura / altura aceita. A capa é uma faixa; a logo é quadrada. */
  proporcaoMinima: number
  proporcaoMaxima: number
  bytesMaximos: number
  mimes: string[]
}

export const REGRAS_IMAGEM: Record<TipoImagemParceiro, RegraImagem> = {
  logo: {
    rotulo: 'A logo',
    coluna: 'logo_url',
    larguraMinima: 500,
    alturaMinima: 500,
    larguraIdeal: 800,
    alturaIdeal: 800,
    proporcaoMinima: 0.8,
    proporcaoMaxima: 1.25,
    bytesMaximos: 2 * 1024 * 1024,
    mimes: ['image/png', 'image/webp'],
  },
  capa: {
    rotulo: 'A capa',
    coluna: 'capa_url',
    larguraMinima: 1600,
    alturaMinima: 533,
    larguraIdeal: 1920,
    alturaIdeal: 640,
    proporcaoMinima: 2.4,
    proporcaoMaxima: 3.6,
    bytesMaximos: 5 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
}

export const LIMITE_FRASE = 160

/** Pedido pronto pra um gerador de imagens -- o parceiro copia e cola. */
export const PEDIDO_CAPA_IA =
  'Crie uma imagem de fundo para a página de uma funerária, em formato paisagem 3:1 (1920 × 640 pixels). ' +
  'Cena serena e acolhedora, luz suave de fim de tarde, natureza (jardim, árvores, céu), tons sóbrios. ' +
  'Sem pessoas, sem texto, sem logotipo, sem cruzes. O centro da imagem deve ficar limpo, porque o nome da ' +
  'empresa será escrito por cima.'

/**
 * Devolve a mensagem de recusa, ou null quando a imagem serve.
 * A mensagem sempre diz o tamanho que a imagem TEM e o que ela precisava ter.
 */
export function validarDimensoes(tipo: TipoImagemParceiro, largura: number, altura: number): string | null {
  const r = REGRAS_IMAGEM[tipo]
  if (largura < r.larguraMinima || altura < r.alturaMinima) {
    return `Essa imagem tem ${largura} × ${altura} px. ${r.rotulo} precisa ter no mínimo ${r.larguraMinima} × ${r.alturaMinima} px. Ela não foi enviada.`
  }
  const proporcao = largura / altura
  if (proporcao < r.proporcaoMinima || proporcao > r.proporcaoMaxima) {
    return tipo === 'capa'
      ? `Essa imagem tem ${largura} × ${altura} px, fora do formato da capa. A capa é uma faixa larga: 3 de largura para 1 de altura (o tamanho certo é ${r.larguraIdeal} × ${r.alturaIdeal} px). Ela não foi enviada.`
      : `Essa imagem tem ${largura} × ${altura} px. A logo precisa ser quadrada (o tamanho certo é ${r.larguraIdeal} × ${r.alturaIdeal} px). Ela não foi enviada.`
  }
  return null
}

export function validarPeso(tipo: TipoImagemParceiro, bytes: number): string | null {
  const r = REGRAS_IMAGEM[tipo]
  if (bytes > r.bytesMaximos) {
    return `Arquivo muito pesado (${(bytes / 1024 / 1024).toFixed(1)} MB). O máximo é ${Math.floor(r.bytesMaximos / 1024 / 1024)} MB.`
  }
  return null
}

/**
 * Lê largura e altura direto dos bytes do arquivo (PNG, JPEG ou WebP), sem
 * biblioteca de imagem. Devolve null quando o arquivo não é uma dessas três
 * coisas de verdade -- extensão trocada não engana.
 */
export function lerDimensoes(b: Uint8Array): { largura: number; altura: number; mime: string } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1]
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
  const txt = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n))

  // PNG: assinatura de 8 bytes + bloco IHDR com largura/altura.
  if (b.length > 24 && b[0] === 0x89 && txt(1, 3) === 'PNG') {
    return { largura: u32(16), altura: u32(20), mime: 'image/png' }
  }

  // JPEG: percorre os segmentos até o SOF (início do quadro).
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const marcador = b[i + 1]
      if (marcador === 0xff) { i++; continue }
      const ehSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc
      if (ehSof) return { largura: u16(i + 7), altura: u16(i + 5), mime: 'image/jpeg' }
      if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) { i += 2; continue }
      i += 2 + u16(i + 2)
    }
    return null
  }

  // WebP: contêiner RIFF com três variantes de bloco.
  if (b.length > 30 && txt(0, 4) === 'RIFF' && txt(8, 4) === 'WEBP') {
    const bloco = txt(12, 4)
    if (bloco === 'VP8X') return { largura: u24le(24) + 1, altura: u24le(27) + 1, mime: 'image/webp' }
    if (bloco === 'VP8 ') return { largura: (b[26] | (b[27] << 8)) & 0x3fff, altura: (b[28] | (b[29] << 8)) & 0x3fff, mime: 'image/webp' }
    if (bloco === 'VP8L') {
      const n = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { largura: (n & 0x3fff) + 1, altura: ((n >> 14) & 0x3fff) + 1, mime: 'image/webp' }
    }
  }

  return null
}

/** Só dígitos, com DDI do Brasil quando faltar -- formato que o wa.me exige. */
export function linkWhatsAppPublico(numero: string | null | undefined): string | null {
  const d = (numero || '').replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith('55') && d.length >= 12 ? d : '55' + d}`
}

export function linkTelefone(numero: string | null | undefined): string | null {
  const d = (numero || '').replace(/\D/g, '')
  return d.length >= 8 ? `tel:+55${d.replace(/^55/, '')}` : null
}
