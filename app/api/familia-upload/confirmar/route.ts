import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'
import { LIMITES_UPLOAD, PASTAS_VALIDAS, detectarTipoReal, type PastaUpload } from '@/lib/uploadFamilia'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Passo 2 de 2. O arquivo já está no Storage (o navegador mandou direto).
// Aqui a gente confere que ele é mesmo do tipo que diz ser, e GRAVA NO BANCO
// na hora -- antes a foto só existia no estado da tela e sumia se o "Salvar"
// falhasse depois, que foi exatamente o que aconteceu com a família Saraiva.
export async function POST(req: NextRequest) {
  const { slug, pasta, caminho } = (await req.json()) as {
    slug?: string
    pasta?: PastaUpload
    caminho?: string
  }

  if (!slug || !pasta || !caminho) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }
  if (!PASTAS_VALIDAS.includes(pasta)) {
    return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, foto_url, video_url, galeria_fotos, videos_galeria')
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

  // O caminho vem do cliente: sem essa trava, alguém logado numa família
  // conseguiria confirmar (e vincular) arquivo de outro memorial.
  if (!caminho.startsWith(`${homenagem.id}/${pasta}/`)) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 403 })
  }

  const apagar = async () => {
    await supabaseAdmin.storage.from('memoriais').remove([caminho])
  }

  const { data: arquivo, error: erroDownload } = await supabaseAdmin.storage
    .from('memoriais')
    .download(caminho)

  if (erroDownload || !arquivo) {
    return NextResponse.json({ error: 'O arquivo não chegou completo. Tente enviar de novo.' }, { status: 400 })
  }

  const ehVideo = pasta === 'video' || pasta === 'videos_galeria'
  const maximo = ehVideo ? LIMITES_UPLOAD.videoBytes : LIMITES_UPLOAD.fotoBytes
  if (arquivo.size > maximo || arquivo.size === 0) {
    await apagar()
    return NextResponse.json({ error: 'Arquivo fora do tamanho permitido.' }, { status: 413 })
  }

  const cabecalho = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer())
  const tipoReal = detectarTipoReal(cabecalho)
  if (!tipoReal || (ehVideo ? !tipoReal.startsWith('video/') : !tipoReal.startsWith('image/'))) {
    await apagar()
    return NextResponse.json(
      { error: ehVideo ? 'Isso não parece um vídeo. Use MP4, WebM ou MOV.' : 'Isso não parece uma imagem. Use JPG, PNG, WebP ou GIF.' },
      { status: 400 }
    )
  }

  const { data: publica } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  const url = publica.publicUrl

  // Grava direto na coluna certa. Isso é o que faz a foto sobreviver mesmo se
  // o "Salvar alterações" der conflito depois.
  const payload: Record<string, unknown> = {}
  const anterior: string | null = pasta === 'foto' ? homenagem.foto_url : pasta === 'video' ? homenagem.video_url : null

  if (pasta === 'foto') payload.foto_url = url
  else if (pasta === 'video') payload.video_url = url
  else if (pasta === 'galeria') {
    const atual: string[] = homenagem.galeria_fotos || []
    if (atual.length >= LIMITES_UPLOAD.maxFotosGaleria) {
      await apagar()
      return NextResponse.json({ error: `A galeria já tem ${LIMITES_UPLOAD.maxFotosGaleria} fotos. Remova uma antes de enviar outra.` }, { status: 409 })
    }
    payload.galeria_fotos = [...atual, url]
  } else {
    const atual: string[] = homenagem.videos_galeria || []
    if (atual.length >= LIMITES_UPLOAD.maxVideosGaleria) {
      await apagar()
      return NextResponse.json({ error: `A galeria já tem ${LIMITES_UPLOAD.maxVideosGaleria} vídeos. Remova um antes de enviar outro.` }, { status: 409 })
    }
    payload.videos_galeria = [...atual, url]
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from('homenagens')
    .update(payload)
    .eq('id', homenagem.id)
    .select('updated_at, galeria_fotos, videos_galeria')
    .single()

  if (error) {
    await apagar()
    return NextResponse.json({ error: 'Enviei o arquivo mas não consegui salvar no memorial. Tente de novo.' }, { status: 500 })
  }

  // Foto/vídeo principal são únicos: troca substitui, então o antigo vira lixo
  // ocupando quota. Só apaga depois que o novo já está gravado no banco.
  if (anterior && anterior !== url) {
    const marcador = '/object/public/memoriais/'
    const i = anterior.indexOf(marcador)
    if (i >= 0) {
      const caminhoAntigo = decodeURIComponent(anterior.slice(i + marcador.length))
      if (caminhoAntigo.startsWith(`${homenagem.id}/`)) {
        await supabaseAdmin.storage.from('memoriais').remove([caminhoAntigo])
      }
    }
  }

  return NextResponse.json({
    ok: true,
    url,
    updatedAt: atualizado?.updated_at,
    galeria: atualizado?.galeria_fotos || [],
    videosGaleria: atualizado?.videos_galeria || [],
  })
}
