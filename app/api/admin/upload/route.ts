import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Rate limiting em memória: { userId: [timestamp1, timestamp2, ...] }
const rateLimitMap = new Map<string, number[]>()

// Limites configuráveis (bytes)
const LIMITS = {
  maxFotoSize: 8 * 1024 * 1024, // 8MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxQuotaPerMemorial: 500 * 1024 * 1024, // 500MB total
  maxFilesPerMinute: 10, // Staff pode fazer mais uploads que família
}

// Magic bytes para detecção de tipo real
const MIME_MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
  'video/quicktime': [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
}

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

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  if (rateLimitMap.has(userId)) {
    const timestamps = rateLimitMap.get(userId)!.filter((t) => t > oneMinuteAgo)
    if (timestamps.length === 0) {
      rateLimitMap.delete(userId)
    } else {
      rateLimitMap.set(userId, timestamps)
    }
  }

  const timestamps = rateLimitMap.get(userId) || []
  if (timestamps.length >= LIMITS.maxFilesPerMinute) {
    return false
  }

  timestamps.push(now)
  rateLimitMap.set(userId, timestamps)
  return true
}

async function removerArquivoAntigoSeExistir(
  supabase: ReturnType<typeof createClient>,
  homenagemId: string,
  pasta: string
): Promise<void> {
  const { data: arquivos } = await supabase.storage
    .from('memoriais')
    .list(`${homenagemId}/${pasta}`)

  if (!arquivos || arquivos.length === 0) return

  const ordenados = arquivos
    .filter((f) => f.id && !f.id.endsWith('/') && f.updated_at)
    .sort((a, b) => new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime())

  if (ordenados.length > 1) {
    const paraApagar = ordenados.slice(0, -1)
    for (const arquivo of paraApagar) {
      await supabase.storage
        .from('memoriais')
        .remove([`${homenagemId}/${pasta}/${arquivo.name}`])
        .catch(() => {})
    }
  }
}

export async function POST(req: NextRequest) {
  // 1. Autenticação (staff/admin)
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const formData = await req.formData()
  const homenagemId = formData.get('homenagemId') as string | null
  const pasta = formData.get('pasta') as string | null
  const file = formData.get('file') as File | null
  const caminhoAntigoParaApagar = formData.get('caminhoAntigoParaApagar') as string | null

  if (!homenagemId || !pasta || !file) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }
  if (!['foto', 'video', 'galeria'].includes(pasta)) {
    return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // 2. Validar memorial
  const { data: homenagem, error: erroHomenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('id', homenagemId)
    .single()

  if (erroHomenagem || !homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  // 3. Rate limit
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Limite de uploads: máximo 10 arquivos por minuto. Tente novamente em alguns segundos.' },
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

  // 7. Upload
  const caminho = `${homenagemId}/${pasta}/${Date.now()}-${file.name}`
  const { error: erroUpload } = await supabaseAdmin.storage
    .from('memoriais')
    .upload(caminho, Buffer.from(buffer), { contentType: mimeDetectado })

  if (erroUpload) {
    console.error('Storage upload error:', erroUpload)
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }

  // 8. Remover arquivo antigo se foi passado
  if (caminhoAntigoParaApagar) {
    await supabaseAdmin.storage
      .from('memoriais')
      .remove([caminhoAntigoParaApagar])
      .catch((err) => console.warn('Falha ao remover arquivo antigo:', err))
  }

  // Remover arquivo antigo automaticamente (apenas para foto/video)
  if (pasta === 'foto' || pasta === 'video') {
    await removerArquivoAntigoSeExistir(supabaseAdmin as any, homenagemId, pasta)
  }

  // 9. Retornar URL pública
  const { data } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  return NextResponse.json({ ok: true, url: data.publicUrl })
}
