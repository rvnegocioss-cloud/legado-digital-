import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'
import { escritaPublicaLiberada } from '@/lib/verificarGatePublico'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const { slug } = await req.json()
  if (!slug) {
    return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })
  }

  // Sem limite de 1x por visitante (pedido do Rafael, 2026-07-24 — pode
  // acender quantas vezes quiser). Teto aqui é só anti-bot, bem folgado.
  const limiteIp = checkResourceRateLimit(`vela:ip:${getClientIp(req)}`, {
    max: 120,
    windowMs: 3600000,
    description: 'velas acesas',
  })
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: limiteIp.message }, { status: 429 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!homenagem || !(await escritaPublicaLiberada(req, supabaseAdmin, homenagem.id))) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin.rpc('acender_vela', { p_slug: slug })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível acender agora' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, total: data })
}
