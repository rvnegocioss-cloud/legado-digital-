import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarTokenAcessoMemorial } from '@/lib/acessoMemorialSessao'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const { memorialId, nome, email } = await req.json()
  const nomeLimpo = (nome || '').trim()
  const emailLimpo = (email || '').trim().toLowerCase()

  if (!memorialId || nomeLimpo.length < 2 || nomeLimpo.length > 120 || !EMAIL_REGEX.test(emailLimpo)) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const limite = checkResourceRateLimit(`cadastro:${memorialId}`, {
    max: 200,
    windowMs: 3600000,
    description: 'identificações neste memorial',
  })
  if (!limite.allowed) return NextResponse.json({ error: limite.message }, { status: 429 })

  const limiteIp = checkResourceRateLimit(`cadastro:ip:${getClientIp(req)}`, {
    max: 20,
    windowMs: 3600000,
    description: 'identificações enviadas',
  })
  if (!limiteIp.allowed) return NextResponse.json({ error: limiteIp.message }, { status: 429 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem?.slug) return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('modo_gate, gate_versao')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  // Não revela que o modo é outro (senha/email/aberto) -- resposta igual
  // a "memorial não encontrado" pra quem tentar chamar essa rota direto
  // num memorial que não está no modo cadastro.
  if ((seguranca?.modo_gate ?? 'aberto') !== 'cadastro') {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  await supabaseAdmin.from('memorial_visitantes').insert({
    homenagem_id: memorialId,
    nome: nomeLimpo,
    email: emailLimpo,
  })

  const token = criarTokenAcessoMemorial(memorialId, 'cadastro', seguranca?.gate_versao ?? 1)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(`mem_acesso_${homenagem.slug}`, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
