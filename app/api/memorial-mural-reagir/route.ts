import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const limiteIp = checkResourceRateLimit(`reagir:ip:${getClientIp(req)}`, {
    max: 60,
    windowMs: 3600000,
    description: 'reações enviadas',
  })
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: limiteIp.message }, { status: 429 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabaseAdmin.rpc('reagir_memoria', { p_id: id })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível reagir agora' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, coracoes: data })
}
