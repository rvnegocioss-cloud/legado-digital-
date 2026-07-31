import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashSenhaMemorial } from '@/lib/senhaMemorial'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { memorialId, senha, tipo } = await req.json()
  const coluna = tipo === 'familia' ? 'senha_familia_hash' : 'senha_acesso_hash'
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Confirma que o usuário é staff ou dono do parceiro desse memorial antes de gravar
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const parceiroIds = ((usuario as any)?.parceiros_usuarios || []).map((pu: any) => pu.parceiro_id)
  const ehDonoDoParceiro = homenagem.parceiro_id && parceiroIds.includes(homenagem.parceiro_id)

  if (!ehStaff && !ehDonoDoParceiro) {
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
