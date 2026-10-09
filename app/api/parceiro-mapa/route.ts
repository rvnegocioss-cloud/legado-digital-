/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { identificarChamador } from '@/lib/autorizacaoEquipe'
import { assinarOrtomosaico } from '@/lib/ortomosaicoAssinado'
import { urlMidiaProtegida } from '@/lib/urlMidia'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Mapa do Portal do Parceiro: a foto aérea do cemitério e SÓ os memoriais
// daquele parceiro, no mesmo formato do mapa público.
//
// Regra do Rafael (2026-10-09): o mapeamento do cemitério -- quadras, fileiras,
// túmulos, ruas, pontos de referência -- é trabalho da Central e não aparece
// pro parceiro. Antes o Portal do Parceiro abria o mapa da Central em modo
// leitura, que mostrava toda essa estrutura. Esta rota não devolve nada dela:
// só um ponto por túmulo que tem memorial do próprio parceiro.
//
// Quem pode: staff (qualquer parceiro) ou o próprio parceiro (regra 22).

export async function GET(req: NextRequest) {
  const cemiterioId = req.nextUrl.searchParams.get('cemiterioId')
  const parceiroId = req.nextUrl.searchParams.get('parceiroId')
  if (!cemiterioId || !parceiroId) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const quem = await identificarChamador(req, supabaseAdmin)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!quem.ehStaff && !quem.parceiroIds.includes(parceiroId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const [{ data: cemiterio }, { data: memoriais }] = await Promise.all([
    supabaseAdmin
      .from('cemiterios')
      .select('id, nome, cidade, estado, latitude, longitude, ortomosaico_url, ortomosaico_minzoom, ortomosaico_maxzoom, ortomosaico_bounds')
      .eq('id', cemiterioId)
      .maybeSingle(),
    supabaseAdmin
      .from('homenagens')
      .select('id, nome_completo, slug, foto_url, lapides!homenagens_lapide_id_fkey!inner(id, nome, latitude, longitude, cemiterio_id)')
      .eq('parceiro_id', parceiroId)
      .eq('lapides.cemiterio_id', cemiterioId)
      .not('slug', 'like', 'rascunho-%')
      .order('nome_completo'),
  ])

  if (!cemiterio) return NextResponse.json({ error: 'Cemitério não encontrado' }, { status: 404 })

  // Um ponto por túmulo, com a lista de quem está ali (mesmo desenho da RPC do
  // mapa público -- dois memoriais no mesmo túmulo não viram dois pinos).
  const porTumulo = new Map<string, { lat: number; lng: number; jazigo: string | null; lista: any[] }>()
  let semLocal = 0
  for (const m of (memoriais || []) as any[]) {
    const l = Array.isArray(m.lapides) ? m.lapides[0] : m.lapides
    if (!m.slug || !l || l.latitude == null || l.longitude == null) {
      semLocal++
      continue
    }
    const item = { slug: m.slug, nome: m.nome_completo, foto_url: urlMidiaProtegida(m.foto_url), protegido: false }
    const atual = porTumulo.get(l.id)
    if (atual) atual.lista.push(item)
    else porTumulo.set(l.id, { lat: Number(l.latitude), lng: Number(l.longitude), jazigo: l.nome || null, lista: [item] })
  }

  const features = [...porTumulo.values()].map((t) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
    properties: { ...t.lista[0], total: t.lista.length, jazigo_nome: t.jazigo, memoriais: t.lista },
  }))

  return NextResponse.json({
    cemiterio: {
      nome: cemiterio.nome,
      cidade: cemiterio.cidade,
      estado: cemiterio.estado,
      latitude: cemiterio.latitude,
      longitude: cemiterio.longitude,
      ortoMinzoom: cemiterio.ortomosaico_minzoom,
      ortoMaxzoom: cemiterio.ortomosaico_maxzoom,
      ortoBounds: cemiterio.ortomosaico_bounds,
    },
    ortoUrl: await assinarOrtomosaico(cemiterio.ortomosaico_url),
    memoriais: { type: 'FeatureCollection', features },
    semLocal,
  })
}
