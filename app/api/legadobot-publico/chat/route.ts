import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PROMPT_PATH = path.join(process.cwd(), 'docs', 'LEGADOBOT_PROMPT_PUBLICO.md')
const MAX_MENSAGEM = 500

export async function POST(req: NextRequest) {
  // Endpoint público sem login — só aceita requisição vinda do próprio site
  // (defesa simples contra script externo bater direto na API; não é à prova
  // de bala, curl não manda Origin, mas barra abuso via navegador de fora).
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host && !origin.includes(host)) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
  }

  const { mensagens: mensagensCompletas } = await req.json()
  if (!Array.isArray(mensagensCompletas) || mensagensCompletas.length === 0) {
    return NextResponse.json({ error: 'mensagens obrigatório' }, { status: 400 })
  }

  // Sem login nenhum aqui — endpoint público. Limita histórico e tamanho pra evitar abuso/custo.
  const mensagens = mensagensCompletas
    .slice(-6)
    .map((m: { role: string; content: string }) => ({ ...m, content: String(m.content || '').slice(0, MAX_MENSAGEM) }))

  let systemPrompt = ''
  try {
    systemPrompt = fs.readFileSync(PROMPT_PATH, 'utf-8')
  } catch {
    systemPrompt = 'Você é o LegadoBot, assistente da landing page do Legado Digital. Responda em português, curto, só sobre o que é o projeto.'
  }

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
        max_tokens: 250,
      }),
    })

    if (!upstream.ok) {
      const texto = await upstream.text()
      console.error(`[LEGADOBOT_PUBLICO] LLM respondeu ${upstream.status}: ${texto.slice(0, 300)}`)
      return NextResponse.json({ error: 'Não consegui responder agora, tenta de novo em instantes.' }, { status: 502 })
    }

    const json = await upstream.json()
    resposta = json.choices?.[0]?.message?.content || ''
  } catch (e) {
    console.error('[LEGADOBOT_PUBLICO] Erro de conexão com o LLM:', e)
    return NextResponse.json({ error: 'Não consegui responder agora, tenta de novo em instantes.' }, { status: 502 })
  }

  let acao: string | null = null
  const match = resposta.match(/AÇÃO:\s*(\/\S+)\s*$/m)
  if (match) {
    acao = match[1]
    resposta = resposta.replace(/\n?AÇÃO:\s*\/\S+\s*$/m, '').trim()

    if (acao !== '/busca' && acao !== '/parceiro/login') acao = null

    // Trava independente do modelo: só navega se a ÚLTIMA mensagem do visitante pedir isso de verdade
    const ultimaDoUsuario = [...mensagens].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || ''
    if (acao === '/busca' && !/busc|encontr|procur|ach.*memorial|memorial de|homenagem de/.test(ultimaDoUsuario)) {
      acao = null
    }
    if (acao === '/parceiro/login' && !/parceir|funerári|minha conta|meu login|entrar na conta/.test(ultimaDoUsuario)) {
      acao = null
    }
  }

  return NextResponse.json({ resposta, acao })
}
