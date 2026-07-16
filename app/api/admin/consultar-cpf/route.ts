import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TOKEN_TESTE = '5ae973d7a997af13f0aaf2bf60e65803'
// TODO: confirmar o pacote certo (preço/dados) na doc "IDs dos Pacotes e Preços"
// antes de qualquer consulta de producao — pacote 1 ("CPF A") e so um exemplo.
const PACOTE_CPF = '1'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { cpf } = await req.json()
  const cpfLimpo = (cpf || '').replace(/\D/g, '')
  if (cpfLimpo.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
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

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  if (!ehStaff) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const tokenProducao = process.env.CPFCNPJ_API_TOKEN
  const modoTeste = !tokenProducao
  const tokenEfetivo = tokenProducao || TOKEN_TESTE

  let res: Response
  try {
    res = await fetch(`https://api.cpfcnpj.com.br/${tokenEfetivo}/${PACOTE_CPF}/${cpfLimpo}`, {
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    console.error('[consultar-cpf] falha de rede ao chamar cpfcnpj.com.br')
    return NextResponse.json({ error: 'Não foi possível consultar o CPF agora' }, { status: 502 })
  }

  if (!res.ok) {
    console.error(`[consultar-cpf] provedor respondeu status ${res.status}`)
    return NextResponse.json({ error: 'CPF não encontrado' }, { status: res.status === 404 ? 404 : 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    nome: data.nome || data.nome_da_pj || '',
    situacao: data.situacao || '',
    modoTeste,
  })
}
