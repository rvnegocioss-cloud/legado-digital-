import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TEMP_PASSWORD = '123456'
const PAPEIS_STAFF = ['Admin Legado Digital', 'Operador Legado Digital']

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
    .in('nome', PAPEIS_STAFF)

  const { data: vinculoStaff } = await admin
    .from('usuarios_perfis')
    .select('perfil_id')
    .eq('usuario_id', caller.id)
    .in('perfil_id', (papeisStaff || []).map((p) => p.id))
    .maybeSingle()

  if (!vinculoStaff) {
    return NextResponse.json({ error: 'Sem permissão pra convidar usuários' }, { status: 403 })
  }

  const { email, nome, papel } = await req.json()
  if (!email || !nome || !papel) {
    return NextResponse.json({ error: 'email, nome e papel são obrigatórios' }, { status: 400 })
  }
  if (!PAPEIS_STAFF.includes(papel)) {
    return NextResponse.json({ error: 'Papel inválido' }, { status: 400 })
  }

  const { data: perfilNovo } = await admin
    .from('perfis')
    .select('id')
    .eq('nome', papel)
    .single()

  if (!perfilNovo) {
    return NextResponse.json({ error: `Papel "${papel}" não encontrado` }, { status: 500 })
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = existingUsers?.users.find((u) => u.email === email)

  let userId: string
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEMP_PASSWORD,
      email_confirm: true,
      user_metadata: { nome },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  }

  await admin.from('usuarios').update({ nome }).eq('id', userId)

  // remove qualquer outro papel de staff que já tivesse (nunca 2 papéis de staff ao mesmo tempo)
  const outrosPapeisStaffIds = (papeisStaff || []).map((p) => p.id).filter((id) => id !== perfilNovo.id)
  if (outrosPapeisStaffIds.length > 0) {
    await admin
      .from('usuarios_perfis')
      .delete()
      .eq('usuario_id', userId)
      .in('perfil_id', outrosPapeisStaffIds)
  }

  await admin
    .from('usuarios_perfis')
    .upsert({ usuario_id: userId, perfil_id: perfilNovo.id }, { onConflict: 'usuario_id,perfil_id' })

  return NextResponse.json({ success: true, email, tempPassword: TEMP_PASSWORD })
}
