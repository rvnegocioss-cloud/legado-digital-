import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Rate limiting em memória: { token: [timestamp1, timestamp2, ...] }
// Limpar entries antigas a cada POST
const rateLimitMap = new Map<string, number[]>()

// Limites configuráveis (bytes)
const LIMITS = {
  maxFotoSize: 8 * 1024 * 1024, // 8MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxQuotaPerMemorial: 500 * 1024 * 1024, // 500MB total
  maxFilesPerMinute: 5,
}

// Magic bytes para detecção de tipo real (não confiar em file.type do cliente)
const MIME_MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp header
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
  'video/quicktime': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // QuickTime
}

/**
 * Detecta MIME type real via magic bytes
 * Retorna null se tipo desconhecido/inválido
 */
function detectMimeType(buffer: Uint8Array): string | null {
  for (const [mime, magicBytes] of Object.entries(MIME_MAGIC_BYTES)) {
    if (buffer.length < magicBytes.length) continue
    let matches = true
    for (let i = 0; i < magicBytes.length; i++) {
      if (buffer[i] !== magicBytes[i]) {
        matches = false
        break
      }
    }
    if (matches) return mime
  }
  return null
}

/**
 * Verifica se token da família excedeu rate limit (5 arquivos/minuto)
 */
function checkRateLimit(token: string): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  // Limpar entries antigas
  if (rateLimitMap.has(token)) {
    const timestamps = rateLimitMap.get(token)!.filter((t) => t > oneMinuteAgo)
    if (timestamps.length === 0) {
      rateLimitMap.delete(token)
    } else {
      rateLimitMap.set(token, timestamps)
    }
  }

  // Checar limite
  const timestamps = rateLimitMap.get(token) || []
  if (timestamps.length >= LIMITS.maxFilesPerMinute) {
    return false // Rate limit excedido
  }

  // Registrar novo upload
  timestamps.push(now)
  rateLimitMap.set(token, timestamps)
  return true // OK
}

/**
 * Calcula uso de quota do memorial (soma de todos os objetos no Storage)
 */
async function getMemorialStorageUsage(
  supabase: ReturnType<typeof createClient>,
  homenagemId: string
): Promise<number> {
  const { data: arquivos, error } = await supabase.storage
    .from('memoriais')
    .list(homenagemId, { limit: 10000 })

  if (error || !arquivos) return 0

  // Recursivamente listar todas as subpastas
  let totalBytes = 0
  const queue = arquivos.slice()

  for (const item of queue) {
    if (item.id && item.id.endsWith('/')) {
      // É uma pasta, listar conteúdo
      const { data: subItems } = await supabase.storage
        .from('memoriais')
        .list(`${homenagemId}/${item.name}`, { limit: 10000 })
      if (subItems) queue.push(...subItems)
    } else if (item.id && !item.id.endsWith('/')) {
      // É um arquivo, somar tamanho (metadata não vem direto, usar 0 como estimativa)
      // Alternativa: fazer HEAD request por arquivo (custoso)
      // Por ora: rejeitar se número de arquivos for alto
      totalBytes += item.metadata?.size || 0
    }
  }

  // Se não conseguir calcular com metadata, contar arquivos
  // Supabase Storage não expõe bytes direto na API — usar heurística:
  // cada foto ~2MB, cada vídeo ~20MB (cliente deve validar antes de enviar)
  return totalBytes
}

/**
 * Remove arquivo antigo ao fazer upload novo (apenas para foto/vídeo principal)
 * Se usuario fez upload de foto antes e agora faz upload nova, apaga a antiga
 */
async function removerArquivoAntigoSeExistir(
  supabase: ReturnType<typeof createClient>,
  homenagemId: string,
  pasta: string
): Promise<void> {
  // Lista arquivos na pasta (foto ou video)
  const { data: arquivos } = await supabase.storage
    .from('memoriais')
    .list(`${homenagemId}/${pasta}`)

  if (!arquivos || arquivos.length === 0) return

  // Ordena por data modificação (mais antigos primeiro)
  const ordenados = arquivos
    .filter((f) => f.id && !f.id.endsWith('/') && f.updated_at)
    .sort((a, b) => new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime())

  // Mantém apenas o 1 arquivo mais recente
  if (ordenados.length > 1) {
    const paraApagar = ordenados.slice(0, -1)
    for (const arquivo of paraApagar) {
      await supabase.storage
        .from('memoriais')
        .remove([`${homenagemId}/${pasta}/${arquivo.name}`])
        .catch(() => {}) // Falha silenciosa se não conseguir deletar
    }
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const slug = formData.get('slug') as string | null
  const pasta = formData.get('pasta') as string | null
  const file = formData.get('file') as File | null
  const caminhoAntigoParaApagar = formData.get('caminhoAntigoParaApagar') as string | null

  if (!slug || !pasta || !file) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }
  if (!['foto', 'video', 'galeria'].includes(pasta)) {
    return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // 1. Validar memorial
  const { data: homenagem, error: erroHomenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .single()

  if (erroHomenagem || !homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  // 2. Validar sessão de família
  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id)) {
    return NextResponse.json({ error: 'Sessão de família inválida ou expirada' }, { status: 401 })
  }

  // 3. Rate limit
  if (!checkRateLimit(token || '')) {
    return NextResponse.json(
      { error: 'Limite de uploads: máximo 5 arquivos por minuto. Tente novamente em alguns segundos.' },
      { status: 429 }
    )
  }

  // 4. Validar tamanho
  if (file.size === 0) {
    return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 })
  }

  // 5. Validar MIME type via magic bytes
  const buffer = new Uint8Array(await file.arrayBuffer())
  const mimeDetectado = detectMimeType(buffer)

  if (!mimeDetectado) {
    return NextResponse.json(
      { error: 'Tipo de arquivo não suportado. Use JPG, PNG, MP4, WebM, MOV ou GIF.' },
      { status: 400 }
    )
  }

  // 6. Validar tamanho conforme tipo
  const maxSize = mimeDetectado.startsWith('video/') ? LIMITS.maxVideoSize : LIMITS.maxFotoSize
  if (file.size > maxSize) {
    const maxMB = Math.floor(maxSize / 1024 / 1024)
    const tipoNome = mimeDetectado.startsWith('video/') ? 'Vídeo' : 'Foto'
    return NextResponse.json(
      { error: `${tipoNome} muito grande. Máximo ${maxMB}MB.` },
      { status: 413 }
    )
  }

  // 7. Validar quota total do memorial
  // Nota: Supabase Storage não expõe bytes direto, usando heurística
  // Se precisar precisão real, usar `list()` + contagem de arquivos
  const usage = await getMemorialStorageUsage(supabaseAdmin as any, homenagem.id)
  const usageAposUpload = usage + file.size

  if (usageAposUpload > LIMITS.maxQuotaPerMemorial) {
    const quotaMB = Math.floor(LIMITS.maxQuotaPerMemorial / 1024 / 1024)
    return NextResponse.json(
      {
        error: `Quota de ${quotaMB}MB atingida para este memorial. Remova fotos/vídeos antigos antes de fazer upload de novo conteúdo.`,
      },
      { status: 507 }
    )
  }

  // 8. Upload do novo arquivo
  const caminho = `${homenagem.id}/${pasta}/${Date.now()}-${file.name}`
  const { error: erroUpload } = await supabaseAdmin.storage
    .from('memoriais')
    .upload(caminho, Buffer.from(buffer), { contentType: mimeDetectado })

  if (erroUpload) {
    console.error('Storage upload error:', erroUpload)
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }

  // 9. Remover arquivo antigo se foi passado (ex: foto anterior)
  if (caminhoAntigoParaApagar) {
    await supabaseAdmin.storage
      .from('memoriais')
      .remove([caminhoAntigoParaApagar])
      .catch((err) => console.warn('Falha ao remover arquivo antigo:', err))
  }

  // Alternativa: remover arquivo antigo automaticamente (apenas para foto/video, não galeria)
  if (pasta === 'foto' || pasta === 'video') {
    await removerArquivoAntigoSeExistir(supabaseAdmin as any, homenagem.id, pasta)
  }

  // 10. Retornar URL pública
  const { data } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  return NextResponse.json({ ok: true, url: data.publicUrl })
}
