/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CAMPOS = {
  foto: 'foto_url',
  video: 'video_url',
  galeria: 'galeria_fotos',
  videos_galeria: 'videos_galeria',
} as const

type Tipo = keyof typeof CAMPOS

// Apaga a mídia DE VERDADE: tira do memorial e remove o arquivo do Storage.
//
// Antes, "remover" só sumia com o link na tela. O arquivo continuava no
// servidor — ocupando a cota de 500 MB do memorial (família que troca 4 fotos
// duas vezes já gastou 12) e, pior, continuava aberto pra quem tivesse a URL.
// Foto de família apagada que segue acessível é problema de privacidade, não
// de espaço.
export async function POST(req: NextRequest) {
  const { slug, tipo, url } = (await req.json()) as { slug?: string; tipo?: Tipo; url?: string }

  if (!slug || !tipo || !(tipo in CAMPOS)) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id, foto_url, video_url, galeria_fotos, videos_galeria')
    .eq('slug', slug)
    .single()

  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const { autorizado } = await autorizarMemorial(req, supabaseAdmin, homenagem as any)
  if (!autorizado) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const campo = CAMPOS[tipo]
  const ehLista = tipo === 'galeria' || tipo === 'videos_galeria'
  const atual = (homenagem as any)[campo]

  const alvo = ehLista ? url : (atual as string | null)
  if (!alvo) return NextResponse.json({ ok: true, jaEstavaVazio: true })

  // Só apaga arquivo que pertence a ESTE memorial. Sem essa trava, uma família
  // conseguiria apagar mídia de qualquer outro memorial mandando a URL dele.
  const marcador = '/object/public/memoriais/'
  const i = alvo.indexOf(marcador)
  const caminho = i >= 0 ? decodeURIComponent(alvo.slice(i + marcador.length)) : null
  if (caminho && !caminho.startsWith(`${homenagem.id}/`)) {
    return NextResponse.json({ error: 'Arquivo não pertence a este memorial' }, { status: 403 })
  }

  const novoValor = ehLista ? ((atual as string[]) || []).filter((u) => u !== url) : null

  const { data: atualizado, error } = await supabaseAdmin
    .from('homenagens')
    .update({ [campo]: novoValor })
    .eq('id', homenagem.id)
    .select('updated_at, foto_url, video_url, galeria_fotos, videos_galeria')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Só remove o arquivo depois que o banco já não aponta mais pra ele — se a
  // ordem fosse inversa e a gravação falhasse, o memorial ficaria com link
  // quebrado na página pública.
  if (caminho) {
    await supabaseAdmin.storage.from('memoriais').remove([caminho])
  }

  return NextResponse.json({
    ok: true,
    updatedAt: atualizado?.updated_at,
    foto_url: atualizado?.foto_url,
    video_url: atualizado?.video_url,
    galeria: atualizado?.galeria_fotos || [],
    videosGaleria: atualizado?.videos_galeria || [],
  })
}
