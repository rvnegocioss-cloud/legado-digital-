import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'
import { getEmailTransporter, REMETENTE } from '@/lib/emailTransport'
import { registrarEmail } from '@/lib/emailLog'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Destinatários sem hardcode: mesma tabela de configuração já usada pelo
// e-mail do fornecedor de placas, editável pela Central.
const CHAVE_DESTINATARIOS = 'emails_leads'
const DESTINATARIOS_PADRAO = 'contato@legadodigital.net'

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function limpar(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  if (!texto) return null
  return texto.slice(0, max)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  const tipo = body.tipo === 'familia' ? 'familia' : body.tipo === 'parceiro' ? 'parceiro' : null
  const nome = limpar(body.nome, 120)
  const email = limpar(body.email, 160)

  if (!tipo || !nome || !email || !email.includes('@')) {
    return NextResponse.json({ error: 'Preencha nome e e-mail válidos' }, { status: 400 })
  }

  // Teto por IP: formulário público, mesmo tratamento das outras escritas
  // abertas (condolência/mural/vela) — o /api/* geral do proxy.ts também cobre.
  const limite = checkResourceRateLimit(`lead:ip:${getClientIp(req)}`, {
    max: 5,
    windowMs: 3600000,
    description: 'envios de contato',
  })
  if (!limite.allowed) {
    return NextResponse.json({ error: limite.message }, { status: 429 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const registro = {
    tipo,
    nome,
    email,
    empresa: limpar(body.empresa, 160),
    telefone: limpar(body.telefone, 40),
    cidade: limpar(body.cidade, 120),
    homenageado: limpar(body.homenageado, 160),
    mensagem: limpar(body.mensagem, 2000),
    origem: tipo === 'familia' ? '/familia/login' : '/parceiro/login',
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert(registro)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Não foi possível enviar agora' }, { status: 500 })
  }

  // O aviso por e-mail é secundário: se o SMTP falhar, o lead já está salvo e
  // aparece na Central do mesmo jeito — nunca devolve erro pro visitante.
  try {
    const { data: config } = await supabaseAdmin
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', CHAVE_DESTINATARIOS)
      .maybeSingle()

    const destinatarios = (config?.valor || DESTINATARIOS_PADRAO)
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)

    if (destinatarios.length > 0) {
      const rotulo = tipo === 'familia' ? 'família' : 'parceiro'
      const assunto = `Novo lead de ${rotulo}: ${nome}`
      const linhas = [
        `Tipo: ${rotulo}`,
        `Nome: ${nome}`,
        registro.empresa ? `Empresa: ${registro.empresa}` : null,
        `E-mail: ${email}`,
        registro.telefone ? `Telefone: ${registro.telefone}` : null,
        registro.cidade ? `Cidade: ${registro.cidade}` : null,
        registro.homenageado ? `Homenageado: ${registro.homenageado}` : null,
        registro.mensagem ? `Mensagem: ${registro.mensagem}` : null,
      ].filter(Boolean)

      const transporter = getEmailTransporter()
      if (!transporter) throw new Error('SMTP não configurado')

      await transporter.sendMail({
        from: REMETENTE,
        to: destinatarios.join(', '),
        subject: assunto,
        text: `${linhas.join('\n')}\n\nVeja em: https://legadodigital.net/admin/emails`,
      })

      await registrarEmail(supabaseAdmin, {
        tipo: 'aviso_lead',
        destinatario: destinatarios.join(', '),
        assunto,
      })
    }
  } catch (err) {
    await registrarEmail(supabaseAdmin, {
      tipo: 'aviso_lead',
      destinatario: DESTINATARIOS_PADRAO,
      assunto: `Novo lead de ${tipo}: ${nome}`,
      status: 'erro',
      erroMsg: err instanceof Error ? err.message : 'falha no envio',
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, id: lead.id })
}
