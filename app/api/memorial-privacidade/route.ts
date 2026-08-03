import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { memorialId, buscaHabilitada, linkHabilitado, qrcodeHabilitado, modoGate } = await req.json()
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
  }

  const MODOS_VALIDOS = ['aberto', 'senha', 'cadastro', 'email', 'oculto']
  if (modoGate !== undefined && !MODOS_VALIDOS.includes(modoGate)) {
    return NextResponse.json({ error: 'modoGate inválido' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  // Staff, parceiro dono OU a própria família (pedido do Rafael, 2026-07-31
  // — a família decide se o próprio memorial fica aberto/travado, mesmo
  // tripé de autorização de /api/memorial-emails-autorizados).
  const { autorizado } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: segurancaAtual } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('gate_versao')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  // Oculto vence os 3 canais -- não dá pra deixar busca/link/QR ligados e o
  // memorial "oculto" ao mesmo tempo (regra 2 do resolver de gate).
  const forcandoOculto = modoGate === 'oculto'

  const payload: Record<string, unknown> = {
    homenagem_id: memorialId,
    busca_habilitada: forcandoOculto ? false : buscaHabilitada,
    link_habilitado: forcandoOculto ? false : linkHabilitado,
    qrcode_habilitado: forcandoOculto ? false : qrcodeHabilitado,
    updated_at: new Date().toISOString(),
    // Bump sempre que a privacidade muda -- derruba na hora qualquer
    // cookie de acesso emitido antes, mesmo dentro da validade dele.
    gate_versao: (segurancaAtual?.gate_versao ?? 1) + 1,
  }
  if (modoGate !== undefined) payload.modo_gate = modoGate

  const { error } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(payload, { onConflict: 'homenagem_id', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
