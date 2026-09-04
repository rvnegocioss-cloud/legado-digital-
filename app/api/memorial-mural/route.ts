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
  const { memorialId, nome, parentesco, texto } = await req.json()
  if (!memorialId || !nome?.trim() || !texto?.trim()) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const limite = checkResourceRateLimit(`mural:${memorialId}`, {
    max: 50,
    windowMs: 3600000,
    description: 'memórias neste memorial',
  })
  if (!limite.allowed) {
    return NextResponse.json({ error: limite.message }, { status: 429 })
  }

  const limiteIp = checkResourceRateLimit(`mural:ip:${getClientIp(req)}`, {
    max: 20,
    windowMs: 3600000,
    description: 'memórias enviadas',
  })
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: limiteIp.message }, { status: 429 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  if (!(await escritaPublicaLiberada(req, supabaseAdmin, memorialId))) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('mural_memorias')
    .insert({
      homenagem_id: memorialId,
      nome: nome.trim(),
      parentesco: parentesco?.trim() || null,
      texto: texto.trim(),
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível enviar agora' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, memoria: data })
}
