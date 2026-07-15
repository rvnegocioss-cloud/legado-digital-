import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const PROMPT_PATH = path.join(process.cwd(), 'docs', 'LEGADOBOT_PROMPT.md')

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { mensagens: mensagensCompletas } = await req.json()
  if (!Array.isArray(mensagensCompletas) || mensagensCompletas.length === 0) {
    return NextResponse.json({ error: 'mensagens obrigatório' }, { status: 400 })
  }
  // Limita histórico enviado pra não estourar rate limit/tokens do plano gratuito da Groq
  const mensagens = mensagensCompletas.slice(-10)

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
    .select('id, nome, email, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id, parceiros_b2b(nome_fantasia, razao_social))')
    .eq('email', userData.user.email)
    .single()

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 403 })
  }

  const papeis = ((usuario as any).usuarios_perfis || []).map((up: any) => up.perfis?.nome).filter(Boolean)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const ehParceiro = papeis.includes('Parceiro B2B')

  if (!ehStaff && !ehParceiro) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const parceiroVinculo = ((usuario as any).parceiros_usuarios || [])[0]
  const parceiroId = parceiroVinculo?.parceiro_id ?? null
  const nomeParceiro = parceiroVinculo?.parceiros_b2b?.nome_fantasia || parceiroVinculo?.parceiros_b2b?.razao_social || null
  const nomeUsuario = (usuario as any).nome || userData.user.email

  let promptBase = ''
  try {
    promptBase = fs.readFileSync(PROMPT_PATH, 'utf-8')
  } catch {
    promptBase = 'Você é o LegadoBot, assistente do Legado Digital. Responda em português.'
  }

  const contexto = ehStaff
    ? `\n\n## Contexto desta conversa\nUsuário logado: ${nomeUsuario} (${userData.user.email}). Papel: staff da Central (acesso total, pode responder sobre qualquer parceiro/memorial). Cumprimente pelo nome na primeira mensagem da conversa.`
    : `\n\n## Contexto desta conversa\nUsuário logado: ${nomeUsuario} (${userData.user.email}). Papel: Parceiro B2B da empresa "${nomeParceiro}" (parceiro_id: ${parceiroId}). Responda SÓ sobre esse parceiro — nunca revele dado de outro parceiro nem informação interna da Central fora do que existe no Portal do Parceiro. Cumprimente pelo nome na primeira mensagem da conversa.`

  const limiteResposta = '\n\nSeja direto e curto: no máximo 3-4 frases por resposta, sem parágrafo longo. Só detalhe mais se o usuário pedir explicitamente.'

  const systemPrompt = promptBase + contexto + limiteResposta

  const baseUrl = process.env.LEGADOBOT_LLM_BASE_URL || 'https://api.groq.com/openai/v1'
  const apiKey = process.env.LEGADOBOT_LLM_API_KEY || ''
  const model = process.env.LEGADOBOT_LLM_MODEL || 'llama-3.3-70b-versatile'

  let resposta = ''
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...mensagens],
        temperature: 0.4,
        max_tokens: 400,
      }),
    })

    if (!upstream.ok) {
      const texto = await upstream.text()
      return NextResponse.json(
        { error: `LLM respondeu erro ${upstream.status}. Detalhe: ${texto.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const json = await upstream.json()
    resposta = json.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    return NextResponse.json(
      { error: `Não consegui conectar no LLM (${baseUrl}). Erro: ${e.message}` },
      { status: 502 }
    )
  }

  let acao: string | null = null
  const match = resposta.match(/AÇÃO:\s*(\/\S+)\s*$/m)
  if (match) {
    acao = match[1]
    resposta = resposta.replace(/\n?AÇÃO:\s*\/\S+\s*$/m, '').trim()

    if (!ehStaff && !acao.startsWith('/parceiro')) {
      acao = null
    }

    // Trava independente do modelo: modelo grátis tende a grudar AÇÃO em toda resposta.
    // Só navega se a última mensagem do usuário realmente pedir navegação.
    const ultimaDoUsuario = [...mensagens].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || ''
    if (acao && !/aonde|onde (eu )?(vejo|acho|encontro|vou)|como (eu )?(vejo|acesso|chego)|leva.*pra|me leva|abre.*p[aá]gina|ir pra|quero ver/.test(ultimaDoUsuario)) {
      acao = null
    }
  }

  return NextResponse.json({ resposta, acao })
}
