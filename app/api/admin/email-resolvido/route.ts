import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { identificarChamador } from '@/lib/autorizacaoEquipe'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Marca (ou desmarca) um e-mail com erro como resolvido. Só staff.
// Só mexe em linha com status='erro'; resolvido_em/resolvido_por são os únicos campos escritos.
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const quem = await identificarChamador(req, supabaseAdmin)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!quem.ehStaff) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  let corpo: { id?: unknown; resolvido?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }
  const id = typeof corpo.id === 'string' ? corpo.id : ''
  if (!UUID.test(id) || typeof corpo.resolvido !== 'boolean') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const agora = corpo.resolvido
  const { data, error } = await supabaseAdmin
    .from('emails_enviados')
    .update(
      agora
        ? { resolvido_em: new Date().toISOString(), resolvido_por: quem.usuarioId }
        : { resolvido_em: null, resolvido_por: null }
    )
    .eq('id', id)
    .eq('status', 'erro')
    .select('id, resolvido_em')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Não foi possível atualizar' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'E-mail com erro não encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, resolvido_em: data.resolvido_em })
}
