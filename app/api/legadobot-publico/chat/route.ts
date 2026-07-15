import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const PROMPT_PATH = path.join(process.cwd(), 'docs', 'LEGADOBOT_PROMPT_PUBLICO.md')
const MAX_MENSAGEM = 500

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: `LLM respondeu erro ${upstream.status}. Detalhe: ${texto.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const json = await upstream.json()
    resposta = json.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    return NextResponse.json({ error: `Não consegui conectar no LLM. Erro: ${e.message}` }, { status: 502 })
  }

  let acao: string | null = null
  const match = resposta.match(/AÇÃO:\s*(\/\S+)\s*$/m)
  if (match) {
    acao = match[1]
    if (acao !== '/busca' && acao !== '/parceiro/login') acao = null
    resposta = resposta.replace(/\n?AÇÃO:\s*\/\S+\s*$/m, '').trim()
  }

  return NextResponse.json({ resposta, acao })
}
