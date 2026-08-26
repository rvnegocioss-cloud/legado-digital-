import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'
import { criarComprovante, verificarComprovante } from '@/lib/comprovanteAssinatura'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  const { memorialId, nome, mensagem } = await req.json()
  if (!memorialId || !nome?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Escrita pública sem trava nenhuma antes disso — client chamava o Supabase
  // REST direto do navegador, então nem o rate limit do proxy.ts alcançava.
  // Limite por memorial (não só por IP) segura contra spam distribuído no
  // mesmo memorial mesmo com IPs diferentes.
  const limite = checkResourceRateLimit(`condolencia:${memorialId}`, {
    max: 50,
    windowMs: 3600000,
    description: 'homenagens neste memorial',
  })
  if (!limite.allowed) {
    return NextResponse.json({ error: limite.message }, { status: 429 })
  }

  const limiteIp = checkResourceRateLimit(`condolencia:ip:${getClientIp(req)}`, {
    max: 20,
    windowMs: 3600000,
    description: 'homenagens enviadas',
  })
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: limiteIp.message }, { status: 429 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabaseAdmin
    .from('condolencias')
    .insert({ homenagem_id: memorialId, visitor_name: nome.trim(), message: mensagem.trim() })
    .select('id, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível enviar agora' }, { status: 500 })
  }

  // O comprovante e o que permite quem assinou desfazer depois. Fica no
  // navegador de quem assinou; sem ele, ninguem remove pela pagina publica.
  return NextResponse.json({
    ok: true,
    id: data.id,
    criadoEm: data.created_at,
    comprovante: criarComprovante(data.id),
  })
}

// Remocao pela propria pessoa que assinou, provada pelo comprovante que ela
// recebeu ao assinar. Sem comprovante valido nao remove nada -- e o unico
// caminho de remocao que existe na pagina publica.
export async function DELETE(req: NextRequest) {
  const { memorialId, id, comprovante } = await req.json()
  if (!memorialId || !id || !comprovante) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (!verificarComprovante(id, comprovante)) {
    return NextResponse.json({ error: 'Essa assinatura não é sua' }, { status: 403 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // O memorialId entra no filtro tambem: sem isso, um comprovante valido de um
  // memorial removeria a assinatura em qualquer outro, se o id fosse conhecido.
  const { error } = await supabaseAdmin
    .from('condolencias')
    .delete()
    .eq('id', id)
    .eq('homenagem_id', memorialId)

  if (error) {
    return NextResponse.json({ error: 'Não foi possível remover agora' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
