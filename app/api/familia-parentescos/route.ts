import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Quem pode aparecer na árvore. A lista fecha o vocabulário de propósito: o
// desenho só sabe posicionar quem cabe numa dessas caixas (regra 23 --
// convenção genealógica tradicional, não parentesco inventado).
const TIPOS = [
  'pai', 'mae', 'conjuge', 'filho', 'filha', 'irmao', 'irma',
  'avo_paterno', 'avo_paterna', 'avo_materno', 'avo_materna', 'neto', 'neta',
] as const

async function autorizar(req: NextRequest, supabaseAdmin: any, slug: string) {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!homenagem) return { erro: 'Memorial não encontrado', status: 404 as const }

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id, seguranca?.senha_familia_hash)) {
    return { erro: 'Sessão de família inválida ou expirada', status: 401 as const }
  }
  return { homenagemId: homenagem.id as string }
}

function limpar(v: unknown, max: number) {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

function inteiro(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const auth = await autorizar(req, supabaseAdmin, slug)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  const { data } = await supabaseAdmin.rpc('obter_arvore_familia', {
    p_homenagem_id: auth.homenagemId,
  })
  return NextResponse.json({ ok: true, arvore: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const auth = await autorizar(req, supabaseAdmin, body.slug)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  const tipo = TIPOS.includes(body.tipo) ? body.tipo : null
  const nome = limpar(body.nome, 160)
  if (!tipo || !nome) {
    return NextResponse.json({ error: 'Informe o nome e o parentesco' }, { status: 400 })
  }

  // Ordem de nascimento só faz sentido entre irmãos e filhos -- é o que a
  // convenção usa pra colocar o mais velho à esquerda.
  const ordem = ['filho', 'filha', 'irmao', 'irma'].includes(tipo)
    ? inteiro(body.ordem_nascimento)
    : null

  const { data, error } = await supabaseAdmin
    .from('parentescos')
    .insert({
      homenagem_id: auth.homenagemId,
      nome,
      tipo,
      uniao: tipo === 'conjuge' && ['casamento', 'separacao'].includes(body.uniao) ? body.uniao : null,
      ordem_nascimento: ordem,
      ano_nascimento: inteiro(body.ano_nascimento),
      ano_falecimento: inteiro(body.ano_falecimento),
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Não foi possível salvar agora' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  const id = req.nextUrl.searchParams.get('id')
  if (!slug || !id) return NextResponse.json({ error: 'slug e id obrigatórios' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const auth = await autorizar(req, supabaseAdmin, slug)
  if ('erro' in auth) return NextResponse.json({ error: auth.erro }, { status: auth.status })

  // O filtro por homenagem_id impede apagar parente da árvore de outra família
  // mesmo com o id na mão.
  await supabaseAdmin.from('parentescos').delete().eq('id', id).eq('homenagem_id', auth.homenagemId)
  return NextResponse.json({ ok: true })
}
