import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResourceRateLimit } from '@/lib/rateLimitUtil'
import { criarComprovante, verificarComprovante } from '@/lib/comprovanteAssinatura'
import { autorizarMemorial } from '@/lib/autorizacaoMemorial'
import { escritaPublicaLiberada } from '@/lib/verificarGatePublico'

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

  if (!(await escritaPublicaLiberada(req, supabaseAdmin, memorialId))) {
    return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
  }

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

// Dois caminhos de remocao, e so dois:
//
// 1. QUEM ASSINOU, na pagina publica: prova com o comprovante que recebeu ao
//    assinar. So alcanca a propria assinatura.
// 2. QUEM CUIDA DO MEMORIAL (familia pelo cookie, staff/parceiro pela sessao):
//    alcanca qualquer assinatura. E o caminho do Livro no Portal da Familia.
//
// Visitante sem comprovante e sem sessao nao remove nada. Isso importa: a
// pagina do memorial e publica, entao remocao livre ali deixaria um estranho
// apagar todas as mensagens que a familia recebeu, sem volta e sem registro.
export async function DELETE(req: NextRequest) {
  const { memorialId, id, comprovante } = await req.json()
  if (!memorialId || !id) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let autorizado = verificarComprovante(id, comprovante)

  if (!autorizado) {
    const { data: homenagem } = await supabaseAdmin
      .from('homenagens')
      .select('id, parceiro_id')
      .eq('id', memorialId)
      .maybeSingle()

    if (!homenagem) {
      return NextResponse.json({ error: 'Memorial não encontrado' }, { status: 404 })
    }

    const resultado = await autorizarMemorial(req, supabaseAdmin, homenagem as never)
    autorizado = resultado.autorizado
  }

  if (!autorizado) {
    return NextResponse.json({ error: 'Sem permissão para remover esta assinatura' }, { status: 403 })
  }

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
