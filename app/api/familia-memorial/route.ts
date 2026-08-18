import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CAMPOS_EDITAVEIS = [
  'nome_completo',
  'data_nascimento',
  'data_falecimento',
  'cidade',
  'frase_preferida',
  'biografia',
  'foto_url',
  'video_url',
  'videos_galeria',
  'galeria_fotos',
  'timeline',
  'vinculos',
  'tema',
] as const

// Campos que o Portal da Família de fato usa (edita + updated_at/preenchido_por
// de contexto) — select('*') devolvia também parceiro_id, mensagem_placa,
// familia_email/telefone etc, sem necessidade nenhuma pro browser da família.
const CAMPOS_LEITURA = [
  'id',
  'nome_completo',
  'data_nascimento',
  'data_falecimento',
  'cidade',
  'frase_preferida',
  'biografia',
  'foto_url',
  'video_url',
  'videos_galeria',
  'galeria_fotos',
  'timeline',
  'vinculos',
  'tema',
  'slug',
  'preenchido_por',
  'updated_at',
].join(', ')

async function buscarMemorialEValidar(supabaseAdmin: any, slug: string, req: NextRequest) {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select(CAMPOS_LEITURA)
    .eq('slug', slug)
    .single()

  if (!homenagem) return { erro: 'Memorial não encontrado', status: 404 } as const

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const token = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (!verificarTokenFamilia(token, homenagem.id, seguranca?.senha_familia_hash)) {
    return { erro: 'Sessão de família inválida ou expirada — faça login de novo', status: 401 } as const
  }

  return { homenagem } as const
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await buscarMemorialEValidar(supabaseAdmin, slug, req)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  // Família não tem acesso direto a homenagens_seguranca (RLS é só
  // staff/parceiro) — expõe aqui só o necessário pra tela mostrar o modo
  // de privacidade atual, sem vazar hash de senha nenhum.
  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('modo_gate, busca_habilitada, link_habilitado, qrcode_habilitado, senha_acesso_hash')
    .eq('homenagem_id', resultado.homenagem.id)
    .maybeSingle()

  return NextResponse.json({
    memorial: resultado.homenagem,
    privacidade: {
      modoGate: seguranca?.modo_gate ?? 'aberto',
      buscaHabilitada: seguranca?.busca_habilitada ?? true,
      linkHabilitado: seguranca?.link_habilitado ?? true,
      qrcodeHabilitado: seguranca?.qrcode_habilitado ?? true,
      // Só o booleano — o hash nunca sai daqui.
      temSenhaAcesso: !!seguranca?.senha_acesso_hash,
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, updatedAtEsperado, valoresBase, ...campos } = body
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const resultado = await buscarMemorialEValidar(supabaseAdmin, slug, req)
  if ('erro' in resultado) return NextResponse.json({ error: resultado.erro }, { status: resultado.status })

  const payload: Record<string, unknown> = {}
  for (const campo of CAMPOS_EDITAVEIS) {
    if (campo in campos) payload[campo] = campos[campo]
  }

  // Conflito é POR CAMPO, não pela linha inteira.
  //
  // A trava antiga comparava `updated_at`: qualquer escrita no memorial —
  // inclusive o upload da própria família, ou a equipe cadastrando o e-mail do
  // responsável — invalidava o salvar e a família perdia tudo o que digitou.
  // Aconteceu de verdade com a família Saraiva, duas vezes no mesmo dia.
  //
  // Agora só bloqueia se o MESMO campo que ela está mandando tiver mudado no
  // servidor desde que a tela carregou. Editar a biografia enquanto alguém
  // vinculou uma foto deixou de ser conflito, porque não é.
  if (valoresBase && typeof valoresBase === 'object') {
    const base = valoresBase as Record<string, unknown>
    const mesmoValor = (a: unknown, b: unknown) =>
      JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

    // A tela manda o formulário inteiro, mas quase sempre a pessoa mexeu em um
    // campo só. Campo que continua igual ao que ela carregou é DESCARTADO aqui:
    // não entra na checagem de conflito nem na escrita.
    //
    // Sem isso, a família mandava de volta o valor velho de galeria_fotos que
    // a equipe tinha acabado de mudar -- e a checagem acusava conflito num
    // campo que ela nem tocou. Achado numa simulação de 5 cenários; era o bug
    // que ainda derrubava o caso real do Pedro mesmo depois da 1ª correção.
    for (const campo of Object.keys(payload)) {
      if (campo in base && mesmoValor(base[campo], payload[campo])) {
        delete payload[campo]
      }
    }

    const conflitos = Object.keys(payload).filter(
      (campo) =>
        campo in base &&
        !mesmoValor(base[campo], (resultado.homenagem as Record<string, unknown>)[campo])
    )

    if (conflitos.length > 0) {
      return NextResponse.json(
        {
          error: 'Outra pessoa mudou este mesmo conteúdo enquanto você editava. Recarregue a página pra ver a versão atual antes de salvar.',
          camposEmConflito: conflitos,
        },
        { status: 409 }
      )
    }
  } else if (updatedAtEsperado && resultado.homenagem.updated_at !== updatedAtEsperado) {
    // Compatibilidade: tela antiga (sem valoresBase) mantém a trava por linha.
    return NextResponse.json(
      { error: 'Esse memorial foi alterado por outra pessoa enquanto você editava. Recarregue a página antes de salvar.' },
      { status: 409 }
    )
  }

  // Nada mudou de verdade -- não escreve (e não carimba updated_at à toa,
  // que era justamente o que disparava conflito na tela dos outros).
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: true, updatedAt: resultado.homenagem.updated_at, semMudanca: true })
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from('homenagens')
    .update(payload)
    .eq('id', resultado.homenagem.id)
    .select('updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updatedAt: atualizado?.updated_at })
}
