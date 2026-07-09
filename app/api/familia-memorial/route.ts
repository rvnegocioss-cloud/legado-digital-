import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CAMPOS_EDITAVEIS = [
  'nome_completo',
  'data_nascimento',
  'data_falecimento',
  'cidade',
  'frase_preferida',
  'biografia',
  'foto_url',
  'video_url',
  'galeria_fotos',
  'timeline',
] as const

async function buscarMemorialEValidar(supabaseAdmin: any, slug: string, req: NextRequest) {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!homenagem) return { erro: 'Memorial não encontrado', status: 404 } as const

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id)) {
    return { erro: 'Sessão de família inválida ou expirada — faça login de novo', status: 401 } as const
  }

  return { homenagem } as const
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await buscarMemorialEValidar(supabaseAdmin, slug, req)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  return NextResponse.json({ memorial: resultado.homenagem })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, ...campos } = body
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await buscarMemorialEValidar(supabaseAdmin, slug, req)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  const payload: Record<string, unknown> = {}
  for (const campo of CAMPOS_EDITAVEIS) {
    if (campo in campos) payload[campo] = campos[campo]
  }

  const { error } = await supabaseAdmin
    .from('homenagens')
    .update(payload)
    .eq('id', resultado.homenagem.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
