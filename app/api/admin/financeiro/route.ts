import { NextRequest, NextResponse } from 'next/server'

import { identificarChamador } from '@/lib/autorizacaoEquipe'
import { lerMemoriais, lerParceiros, montarDadosFinanceiros } from '@/lib/financeiro/consultas'
import { supabaseServidor } from '@/lib/supabaseServidor'

// Legado Financeiro (Central). SOMENTE LEITURA e SOMENTE STAFF.
// Devolve contagens por mês/origem e a lista de parceiros; nenhum dado de família.
export async function GET(req: NextRequest) {
  const quem = await identificarChamador(req, supabaseServidor)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!quem.ehStaff) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    const [memoriais, parceiros] = await Promise.all([lerMemoriais(supabaseServidor), lerParceiros(supabaseServidor)])
    return NextResponse.json(montarDadosFinanceiros(memoriais, parceiros), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar' }, { status: 500 })
  }
}
