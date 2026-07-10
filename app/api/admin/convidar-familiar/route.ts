import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEMP_PASSWORD = '123456'
const LIMITE_FAMILIARES = 4

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: { user: caller }, error: callerError } = await anonClient.auth.getUser(token)
  if (callerError || !caller) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Confirma que quem chama é staff ou o parceiro dono do memorial
  const { memorialId, email, nome } = await req.json()
  if (!memorialId || !email) {
    return NextResponse.json({ error: 'memorialId e email são obrigatórios' }, { status: 400 })
  }

  const { data: homenagem } = await admin
    .from('homenagens')
    .select('id, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data: papeisStaff } = await admin
    .from('perfis')
    .select('id')
    .in('nome', ['Admin Legado Digital', 'Operador Legado Digital'])

  const { data: vinculoStaff } = await admin
    .from('usuarios_perfis')
    .select('perfil_id')
    .eq('usuario_id', caller.id)
    .in('perfil_id', (papeisStaff || []).map((p) => p.id))
    .maybeSingle()

  let autorizado = !!vinculoStaff
  if (!autorizado && homenagem.parceiro_id) {
    const { data: vinculoParceiro } = await admin
      .from('parceiros_usuarios')
      .select('parceiro_id')
      .eq('usuario_id', caller.id)
      .eq('parceiro_id', homenagem.parceiro_id)
      .maybeSingle()
    autorizado = !!vinculoParceiro
  }

  if (!autorizado) {
    return NextResponse.json({ error: 'Sem permissão pra convidar familiares desse memorial' }, { status: 403 })
  }

  const { count } = await admin
    .from('responsaveis_familiares')
    .select('id', { count: 'exact', head: true })
    .eq('homenagem_id', memorialId)

  if ((count || 0) >= LIMITE_FAMILIARES) {
    return NextResponse.json({ error: `Limite de ${LIMITE_FAMILIARES} familiares com acesso já atingido` }, { status: 400 })
  }

  const { data: perfilFamiliar } = await admin
    .from('perfis')
    .select('id')
    .eq('nome', 'Familiar Responsável')
    .single()

  if (!perfilFamiliar) {
    return NextResponse.json({ error: 'Papel "Familiar Responsável" não encontrado' }, { status: 500 })
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = existingUsers?.users.find((u) => u.email === email)

  let userId: string
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: nome || email },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  }

  await admin
    .from('usuarios_perfis')
    .upsert({ usuario_id: userId, perfil_id: perfilFamiliar.id }, { onConflict: 'usuario_id,perfil_id' })

  const { error: erroResponsavel } = await admin
    .from('responsaveis_familiares')
    .upsert(
      { homenagem_id: memorialId, usuario_id: userId, nome: nome || email, email, tipo: 'responsavel' },
      { onConflict: 'homenagem_id,email' }
    )

  if (erroResponsavel) return NextResponse.json({ error: erroResponsavel.message }, { status: 500 })

  return NextResponse.json({ success: true, email, tempPassword: TEMP_PASSWORD })
}
