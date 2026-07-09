import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const slug = formData.get('slug') as string | null
  const pasta = formData.get('pasta') as string | null
  const file = formData.get('file') as File | null

  if (!slug || !pasta || !file) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }
  if (!['foto', 'video', 'galeria'].includes(pasta)) {
    return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id)) {
    return NextResponse.json({ error: 'Sessão de família inválida ou expirada' }, { status: 401 })
  }

  const caminho = `${homenagem.id}/${pasta}/${Date.now()}-${file.name}`
  const bytes = await file.arrayBuffer()
  const { error } = await supabaseAdmin.storage
    .from('memoriais')
    .upload(caminho, Buffer.from(bytes), { upsert: true, contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  return NextResponse.json({ ok: true, url: data.publicUrl })
}
