// Regras de upload da família, compartilhadas pelas rotas de preparar e
// confirmar (antes viviam duplicadas dentro de /api/familia-upload).

export const PASTAS_VALIDAS = ['foto', 'video', 'galeria', 'videos_galeria'] as const
export type PastaUpload = (typeof PASTAS_VALIDAS)[number]

export const LIMITES_UPLOAD = {
  fotoBytes: 8 * 1024 * 1024,
  videoBytes: 100 * 1024 * 1024,
  quotaBytes: 500 * 1024 * 1024,
  arquivosPorMinuto: 10,
  maxFotosGaleria: 4,
  maxVideosGaleria: 4,
}

// Assinaturas reais de arquivo. Nunca confiar no tipo declarado pelo cliente —
// é o único jeito de garantir que um .jpg não é um executável renomeado.
const ASSINATURAS: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'video/webm': [0x1a, 0x45, 0xdf, 0xa3],
}

export function detectarTipoReal(bytes: Uint8Array): string | null {
  for (const [mime, assinatura] of Object.entries(ASSINATURAS)) {
    if (bytes.length < assinatura.length) continue
    let bate = true
    for (let i = 0; i < assinatura.length; i++) {
      if (bytes[i] !== assinatura[i]) {
        bate = false
        break
      }
    }
    if (bate) return mime
  }
  // MP4/MOV e outros do mesmo container têm "ftyp" no byte 4, com marca de
  // variação (isom, mp42, qt) logo depois — checar por assinatura fixa como
  // as de cima falha em arquivo de celular, que varia o tamanho do box.
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const marca = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    if (marca.startsWith('qt')) return 'video/quicktime'
    return 'video/mp4'
  }
  return null
}

const rateLimit = new Map<string, number[]>()

export function checarRateLimitFamilia(token: string) {
  const agora = Date.now()
  const umMinutoAtras = agora - 60_000
  const marcas = (rateLimit.get(token) || []).filter((t) => t > umMinutoAtras)
  if (marcas.length >= LIMITES_UPLOAD.arquivosPorMinuto) {
    rateLimit.set(token, marcas)
    return false
  }
  marcas.push(agora)
  rateLimit.set(token, marcas)
  return true
}
