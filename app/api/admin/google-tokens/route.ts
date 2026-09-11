import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Guarda o acesso Google (Gmail/Calendar/Drive) da pessoa que acabou de logar
// com a conta Google dela. O token vem do próprio navegador (é a resposta do
// Google pro login que já aconteceu), nunca de um caminho que outra pessoa
// poderia forjar -- e o dono é sempre quem o Bearer prova ser, nunca um id
// mandado no corpo (regra 22 ampliada: nem staff vê o token de outro staff).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: { user: caller }, error: callerError } = await anonClient.auth.getUser(token)
  if (callerError || !caller) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

  const { providerToken, providerRefreshToken, escopos } = await req.json()
  if (!providerToken) return NextResponse.json({ error: 'providerToken obrigatório' }, { status: 400 })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Só staff (Admin/Operador Legado Digital) guarda token aqui -- parceiro
  // nunca passa por este fluxo (login dele não pede escopo do Google).
  const { data: papeisStaff } = await admin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome))')
    .eq('id', caller.id)
    .single()
  const papeis = ((papeisStaff as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  if (!ehStaff) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { error } = await admin
    .from('google_tokens')
    .upsert(
      {
        usuario_id: caller.id,
        provider_token: providerToken,
        provider_refresh_token: providerRefreshToken || null,
        escopos: escopos || '',
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'usuario_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
