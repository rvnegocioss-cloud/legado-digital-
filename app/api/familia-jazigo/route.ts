import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Jazigo do memorial que a família administra: ela vê o túmulo inteiro e quem
// está em cada gaveta, mas nunca escreve — quem cadastra gaveta é o parceiro.
// Só leitura de propósito, por isso não existe POST/PATCH aqui.
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
