import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: vinculos } = await admin.from('parceiros_usuarios').select('usuario_id, parceiro_id')
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 })

  const lastSignInPorUsuario = new Map<string, string | null>()
  for (const u of authUsers?.users || []) {
    lastSignInPorUsuario.set(u.id, u.last_sign_in_at ?? null)
  }

  const ultimaAtividadePorParceiro: Record<string, string | null> = {}
  for (const v of vinculos || []) {
    const lastSignIn = lastSignInPorUsuario.get(v.usuario_id)
    const atual = ultimaAtividadePorParceiro[v.parceiro_id]
    if (!atual || (lastSignIn && new Date(lastSignIn) > new Date(atual))) {
      ultimaAtividadePorParceiro[v.parceiro_id] = lastSignIn ?? atual ?? null
    }
  }

  return NextResponse.json({ ultimaAtividadePorParceiro })
}
