import { NextRequest, NextResponse } from 'next/server'

import { decidirAcessoParceiro } from '@/lib/financeiro/acesso'
import { identificarChamador } from '@/lib/autorizacaoEquipe'
import { formatarData, lerMemoriais, lerParceiros, soDoParceiro } from '@/lib/financeiro/consultas'
import { supabaseServidor } from '@/lib/supabaseServidor'

// Visão do Parceiro. SOMENTE LEITURA. Staff OU o próprio parceiro; o filtro por parceiro_id é feito
// no servidor (consulta e de novo em memória). Nada nosso: sem custo, sem outros parceiros, sem margem.
export async function GET(req: NextRequest) {
  const quem = await identificarChamador(req, supabaseServidor)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const decisao = decidirAcessoParceiro(quem, req.nextUrl.searchParams.get('parceiro_id'))
  if (!decisao.ok) {
    return NextResponse.json({ error: decisao.status === 403 ? 'Sem permissão' : 'Parceiro não informado' }, { status: decisao.status })
  }

  try {
    const [memoriais, parceiros] = await Promise.all([
      lerMemoriais(supabaseServidor, decisao.parceiroId),
      lerParceiros(supabaseServidor, decisao.parceiroId),
    ])
    const meus = soDoParceiro(memoriais, decisao.parceiroId)
    return NextResponse.json(
      {
        consultadoEm: new Date().toISOString(),
        nome: parceiros[0]?.nome_fantasia || parceiros[0]?.razao_social || 'Parceiro',
        memoriais: meus.map((m) => ({ criadoEm: m.created_at, criadoEmTexto: formatarData(m.created_at), origem: m.origem_cadastro })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar' }, { status: 500 })
  }
}
