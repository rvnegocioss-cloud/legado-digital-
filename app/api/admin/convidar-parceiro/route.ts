import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEMP_PASSWORD = '123456'

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

  if (!vinculoStaff) {
    return NextResponse.json({ error: 'Sem permissão pra convidar parceiros' }, { status: 403 })
  }

  const { parceiroId, email, nome, contatoId } = await req.json()
  if (!parceiroId || !email) {
    return NextResponse.json({ error: 'parceiroId e email são obrigatórios' }, { status: 400 })
  }

  const { data: perfilParceiro } = await admin
    .from('perfis')
    .select('id')
    .eq('nome', 'Parceiro B2B')
    .single()

  if (!perfilParceiro) {
    return NextResponse.json({ error: 'Papel "Parceiro B2B" não encontrado' }, { status: 500 })
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
    .upsert({ usuario_id: userId, perfil_id: perfilParceiro.id }, { onConflict: 'usuario_id,perfil_id' })

  await admin
    .from('parceiros_usuarios')
    .upsert({ usuario_id: userId, parceiro_id: parceiroId }, { onConflict: 'usuario_id,parceiro_id' })

  if (contatoId) {
    await admin.from('parceiros_contatos').update({ usuario_id: userId }).eq('id', contatoId)
  }

  return NextResponse.json({ success: true, email, tempPassword: TEMP_PASSWORD })
}
