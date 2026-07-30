import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMemorialStorageUsage } from '@/lib/storageUsage'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const memorialId = req.nextUrl.searchParams.get('memorialId')
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

  // Família autenticada pelo próprio cookie de sessão do memorial (mesmo
  // padrão de app/api/familia-memorial/route.ts) — sem sessão Supabase Auth.
  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const tokenFamilia = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (verificarTokenFamilia(tokenFamilia, homenagem.id, seguranca?.senha_familia_hash)) {
    const usageBytes = await getMemorialStorageUsage(supabaseAdmin, memorialId)
    return NextResponse.json({ usageBytes })
  }

  // Senão, staff ou parceiro dono do memorial, via sessão Supabase Auth.
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
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

  const usageBytes = await getMemorialStorageUsage(supabaseAdmin, memorialId)
  return NextResponse.json({ usageBytes })
}
