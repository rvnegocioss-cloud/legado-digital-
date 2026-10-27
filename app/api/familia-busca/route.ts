import { NextResponse } from 'next/server'
import { supabaseServidor } from '@/lib/supabaseServidor'

// Busca por nome usada SÓ no login do Portal da Família. Diferente da busca
// pública, não esconde memorial offline/oculto: a família precisa achar o nome
// pra entrar e só então colocar o memorial online (pedido do Rafael,
// 2026-10-27). Devolve só id, nome, cidade e slug -- nunca foto nem datas.
// Rascunho nunca entra.

// Postgres ilike não ignora acento. Letra que pode ter acento vira "_" (um
// caractere qualquer), então "jose" acha "José" sem precisar de extensão.
function padraoSemAcento(termo: string): string {
  const limpo = termo
    .trim()
    .slice(0, 80)
    .replace(/[%\\,()]/g, ' ')
  return (
    '%' +
    limpo
      .split('')
      .map((c) => (/[a-zA-Z]/.test(c) ? (/[aeiouycnAEIOUYCN]/.test(c) ? '_' : c) : /\s/.test(c) ? '%' : '_'))
      .join('') +
    '%'
  )
}

export async function GET(req: Request) {
  const termo = (new URL(req.url).searchParams.get('termo') || '').trim()
  if (termo.length < 2) return NextResponse.json({ resultados: [] })

  const { data, error } = await supabaseServidor
    .from('homenagens')
    .select('id, nome_completo, cidade, slug')
    .not('slug', 'is', null)
    .not('slug', 'like', 'rascunho-%')
    .neq('nome_completo', 'Novo memorial')
    .ilike('nome_completo', padraoSemAcento(termo))
    .order('nome_completo')
    .limit(30)

  if (error) return NextResponse.json({ resultados: [] }, { status: 500 })
  return NextResponse.json({
    resultados: (data || []).map((h) => ({ ...h, foto_url: null })),
  })
}
