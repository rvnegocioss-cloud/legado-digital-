import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cnpj = req.nextUrl.searchParams.get('cnpj')?.replace(/\D/g, '')
  if (!cnpj || cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
  if (!res.ok) {
    const corpoErro = await res.text().catch(() => '')
    console.error(`[consultar-cnpj] BrasilAPI respondeu ${res.status}: ${corpoErro.slice(0, 300)}`)
    return NextResponse.json({ error: 'CNPJ não encontrado na Receita' }, { status: res.status === 404 ? 404 : 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    razao_social: data.razao_social || '',
    nome_fantasia: data.nome_fantasia || '',
    email: data.email || '',
    telefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/(\d{2})(\d)/, '($1) $2') : '',
    cidade: data.municipio || '',
    estado: data.uf || '',
  })
}
