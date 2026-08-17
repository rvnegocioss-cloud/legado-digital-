import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashSenhaMemorial } from '@/lib/senhaMemorial'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { memorialId, senha, tipo } = await req.json()
  const coluna = tipo === 'familia' ? 'senha_familia_hash' : 'senha_acesso_hash'
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
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

  // Tripé staff / parceiro dono / família (2026-08-17: a família passou a
  // definir a senha de visita do próprio memorial). Família mexe SÓ na senha
  // de acesso — trocar a senha_familia_hash daqui deixaria a sessão dela
  // reescrever o próprio fator de login, então isso continua só com staff.
  const { autorizado, comoFamilia } = await autorizarMemorial(req, supabaseAdmin, homenagem)
  if (!autorizado) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (comoFamilia && coluna !== 'senha_acesso_hash') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const valor = senha ? hashSenhaMemorial(memorialId, senha) : null

  const { data: segurancaAtual } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('modo_gate, gate_versao')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  const payload: Record<string, unknown> = {
    homenagem_id: memorialId,
    [coluna]: valor,
    updated_at: new Date().toISOString(),
  }

  // Senha "de acesso" (não a da família) é o único caso onde essa rota
  // decide o modo sozinha — nunca pisa em cadastro/email/oculto, só
  // transita entre aberto<->senha, e sempre derruba cookie emitido antes.
  if (coluna === 'senha_acesso_hash') {
    const modoAtual = segurancaAtual?.modo_gate ?? 'aberto'
    if (valor && modoAtual === 'aberto') payload.modo_gate = 'senha'
    if (!valor && modoAtual === 'senha') payload.modo_gate = 'aberto'
    payload.gate_versao = (segurancaAtual?.gate_versao ?? 1) + 1
  }

  const { error } = await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(payload, { onConflict: 'homenagem_id', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, temSenha: !!valor })
}
