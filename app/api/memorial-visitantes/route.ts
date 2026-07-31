import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const memorialId = req.nextUrl.searchParams.get('memorialId')
  if (!memorialId) return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const { autorizado } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: visitantes } = await supabaseAdmin
    .from('memorial_visitantes')
    .select('id, nome, email, criado_em')
    .eq('homenagem_id', memorialId)
    .order('criado_em', { ascending: false })
    .limit(500)

  return NextResponse.json({ visitantes: visitantes || [] })
}
