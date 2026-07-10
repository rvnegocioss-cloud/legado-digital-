import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashSenhaMemorial } from '@/lib/senhaMemorial'
import { ehResponsavelFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000)) // 6 dígitos
}

export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!ehResponsavelFamilia(token, homenagem.id)) {
    return NextResponse.json({ error: 'Só o familiar responsável pode gerar código de acesso' }, { status: 403 })
  }

  const codigo = gerarCodigo()
  const hash = hashSenhaMemorial(homenagem.id, codigo)

  const { error } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(
      { homenagem_id: homenagem.id, senha_familia_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'homenagem_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, codigo })
}
