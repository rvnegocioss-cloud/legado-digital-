import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface PerfilLink {
  perfis: { nome: string } | null
}

export async function GET(req: NextRequest) {
  // Rota está sob /admin/ mas nunca checou login nenhum — proxy aberto pra
  // BrasilAPI em nome do nosso domínio. Mesmo padrão de auth de
  // consultar-cpf/route.ts (staff-only via Supabase Auth + tabela usuarios).
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const cnpj = req.nextUrl.searchParams.get('cnpj')?.replace(/\D/g, '')
  if (!cnpj || cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('usuarios_perfis(perfis(nome))')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario?.usuarios_perfis || []) as unknown as PerfilLink[]).map((up) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  if (!ehStaff) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LegadoDigital/1.0; +https://legado-digital-two.vercel.app)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const corpoErro = await res.text().catch(() => '')
    console.error(`[consultar-cnpj] BrasilAPI respondeu ${res.status}: ${corpoErro.slice(0, 300)}`)
    return NextResponse.json({ error: 'CNPJ não encontrado na Receita' }, { status: res.status === 404 ? 404 : 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    razao_social: data.razao_social || '',
    nome_fantasia: data.nome_fantasia || '',
    email: data.email || '',
    telefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/(\d{2})(\d)/, '($1) $2') : '',
    cidade: data.municipio || '',
    estado: data.uf || '',
  })
}
