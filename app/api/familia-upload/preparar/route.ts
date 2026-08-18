import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'
import { getMemorialStorageUsage } from '@/lib/storageUsage'
import { LIMITES_UPLOAD, PASTAS_VALIDAS, checarRateLimitFamilia, type PastaUpload } from '@/lib/uploadFamilia'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Passo 1 de 2 do upload da família.
//
// Por que o arquivo NÃO passa mais por dentro do Next: a Vercel corta qualquer
// requisição de função serverless acima de ~4,5 MB, devolvendo "Request Entity
// Too Large" em texto puro. Foto de celular passa disso fácil e vídeo passa
// sempre — o upload morria antes de chegar no nosso código, e o cliente ainda
// quebrava tentando ler aquilo como JSON.
//
// Agora esta rota só confere permissão/quota e devolve uma URL assinada; o
// navegador manda o arquivo direto pro Storage, sem teto de tamanho nosso.
export async function POST(req: NextRequest) {
  const { slug, pasta, tamanho, nome } = (await req.json()) as {
    slug?: string
    pasta?: PastaUpload
    tamanho?: number
    nome?: string
  }

  if (!slug || !pasta || !tamanho || !nome) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }
  if (!PASTAS_VALIDAS.includes(pasta)) {
    return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id, seguranca?.senha_familia_hash)) {
    return NextResponse.json({ error: 'Sua sessão expirou. Entre de novo pra continuar.' }, { status: 401 })
  }

  if (!checarRateLimitFamilia(token || '')) {
    return NextResponse.json(
      { error: `Muitos envios seguidos. Espere um minuto — o limite é ${LIMITES_UPLOAD.arquivosPorMinuto} arquivos por minuto.` },
      { status: 429 }
    )
  }

  const ehVideo = pasta === 'video' || pasta === 'videos_galeria'
  const maximo = ehVideo ? LIMITES_UPLOAD.videoBytes : LIMITES_UPLOAD.fotoBytes
  if (tamanho > maximo) {
    const maxMB = Math.floor(maximo / 1024 / 1024)
    return NextResponse.json(
      { error: `${ehVideo ? 'Vídeo' : 'Foto'} muito grande (${(tamanho / 1024 / 1024).toFixed(1)} MB). O máximo é ${maxMB} MB.` },
      { status: 413 }
    )
  }

  const usado = await getMemorialStorageUsage(supabaseAdmin as never, homenagem.id)
  if (usado + tamanho > LIMITES_UPLOAD.quotaBytes) {
    const quotaMB = Math.floor(LIMITES_UPLOAD.quotaBytes / 1024 / 1024)
    return NextResponse.json(
      { error: `Espaço de ${quotaMB} MB cheio neste memorial. Apague alguma foto ou vídeo antes de enviar outro.` },
      { status: 507 }
    )
  }

  const nomeLimpo = nome.replace(/[^\w.\-]+/g, '_').slice(-80)
  const caminho = `${homenagem.id}/${pasta}/${Date.now()}-${nomeLimpo}`

  const { data: assinada, error } = await supabaseAdmin.storage
    .from('memoriais')
    .createSignedUploadUrl(caminho)

  if (error || !assinada) {
    return NextResponse.json({ error: 'Não consegui preparar o envio. Tente de novo.' }, { status: 500 })
  }

  return NextResponse.json({ caminho, token: assinada.token })
}
