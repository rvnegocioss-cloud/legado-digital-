/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assinarOrtomosaico } from '@/lib/ortomosaicoAssinado'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// A Central e o Portal do Parceiro montam o mapa no navegador, então precisam
// pedir a URL assinada por aqui (as páginas públicas assinam no servidor).
// Só devolve pra quem já pode ver aquele cemitério — a checagem é a mesma RPC
// que a RLS usa (pode_ver_cemiterio), executada com a credencial da pessoa.
export async function GET(req: NextRequest) {
  const cemiterioId = req.nextUrl.searchParams.get('cemiterioId')
  const authHeader = req.headers.get('authorization')
  if (!cemiterioId) return NextResponse.json({ error: 'cemiterioId obrigatório' }, { status: 400 })
  if (!authHeader) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabaseUsuario = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: podeVer } = await supabaseUsuario.rpc('pode_ver_cemiterio', { p_cemiterio_id: cemiterioId })
  if (!podeVer) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: cemiterio } = await supabaseAdmin
    .from('cemiterios')
    .select('ortomosaico_url')
    .eq('id', cemiterioId)
    .single()

  const url = await assinarOrtomosaico((cemiterio as any)?.ortomosaico_url)
  return NextResponse.json({ url })
}
