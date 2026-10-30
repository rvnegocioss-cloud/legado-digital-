import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const LIMITE_NOME = 120

// Jazigo do memorial que a família administra: ela vê o túmulo inteiro e quem
// está em cada gaveta. Criar e apagar gaveta continua sendo só do parceiro/staff
// — a família escreve apenas o nome do jazigo e o nome de quem está numa gaveta
// que ainda não virou memorial (POST abaixo, 2026-09-15).
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()

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
    return NextResponse.json({ error: 'Sessão de família inválida ou expirada' }, { status: 401 })
  }

  const { data: jazigo } = await supabaseAdmin.rpc('obter_jazigo_do_memorial', {
    p_homenagem_id: homenagem.id,
  })

  // Memorial sem túmulo vinculado ainda: não é erro, o card só não aparece.
  return NextResponse.json({ ok: true, jazigo: jazigo || null, homenagemId: homenagem.id })
}

// A família nomeia o próprio jazigo ("Jazigo Família Saraiva") e escreve quem
// está enterrado nas gavetas que ainda não viraram memorial. O que ela salva
// aqui aparece no card do jazigo no mapa da Central.
//
// Limites de escrita, nesta ordem:
//  - só o jazigo do próprio memorial (vem de homenagens.lapide_id, nunca de um
//    id mandado no corpo da requisição);
//  - só gavetas daquele jazigo;
//  - só gaveta SEM memorial. Gaveta com memorial tem dono — pode ser de outra
//    família, e o nome de lá vem do memorial, não deste campo.
export async function POST(req: NextRequest) {
  const { slug, nome, gavetas } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, lapide_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id, seguranca?.senha_familia_hash)) {
    return NextResponse.json({ error: 'Sessão de família inválida ou expirada' }, { status: 401 })
  }

  if (!homenagem.lapide_id) {
    return NextResponse.json(
      { error: 'Este memorial ainda não está ligado a um jazigo. Fale com a funerária.' },
      { status: 400 }
    )
  }

  if (typeof nome === 'string') {
    const limpo = nome.trim().slice(0, LIMITE_NOME)
    const { error } = await supabaseAdmin
      .from('lapides')
      .update({ nome: limpo || null })
      .eq('id', homenagem.lapide_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(gavetas) && gavetas.length > 0) {
    // As gavetas que a família PODE escrever, lidas do banco — nunca confia no
    // id que veio no corpo sem conferir de quem ele é.
    const { data: permitidas } = await supabaseAdmin
      .from('gavetas')
      .select('id')
      .eq('lapide_id', homenagem.lapide_id)
      .is('homenagem_id', null)

    const idsPermitidos = new Set((permitidas || []).map((g: { id: string }) => g.id))

    for (const g of gavetas) {
      if (!g?.id || !idsPermitidos.has(g.id)) continue
      const limpo = typeof g.nome === 'string' ? g.nome.trim().slice(0, LIMITE_NOME) : ''
      const { error } = await supabaseAdmin
        .from('gavetas')
        .update({ nome_sem_memorial: limpo || null })
        .eq('id', g.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
