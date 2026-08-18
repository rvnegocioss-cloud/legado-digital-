/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarPasseMidiaEquipe, COOKIE_MIDIA_EQUIPE } from '@/lib/sessaoMidiaEquipe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Troca a credencial de staff/parceiro por um cookie curto que a tag <img>
// consegue mandar. Sem isso, a Central abriria a ficha de um memorial
// protegido e veria imagem quebrada.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error } = await supabaseAuth.auth.getUser()
  if (error || !userData.user) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const ehParceiro = ((usuario as any)?.parceiros_usuarios || []).length > 0

  if (!ehStaff && !ehParceiro) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_MIDIA_EQUIPE, criarPasseMidiaEquipe((usuario as any).id), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return res
}
