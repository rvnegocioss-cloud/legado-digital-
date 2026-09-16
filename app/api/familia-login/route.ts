import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarSenhaMemorial } from '@/lib/senhaMemorial'
import { criarTokenFamilia } from '@/lib/familiaSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Resposta única pro caminho por nome: erra o nome, erra a senha ou o memorial
// está escondido -- a família vê sempre a mesma frase. É o que impede alguém
// de descobrir, testando nomes nesta tela, quais memoriais escondidos existem.
const ERRO_GENERICO = 'Nome ou senha não conferem. Confira o nome do homenageado e a senha que chegou por e-mail.'

export async function POST(req: NextRequest) {
  const { slug, nome, senha } = await req.json()
  if ((!slug && !nome) || !senha) {
    return NextResponse.json({ ok: false, error: 'Preencha a senha' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Dois caminhos de entrada:
  //
  // 1. slug -- a família achou o memorial na busca e clicou nele. É o caminho
  //    de sempre, e vale pra memorial que aparece na busca.
  //
  // 2. nome + senha -- caminho novo (2026-09-16). A busca da tela de login usa
  //    a mesma função da busca pública, que esconde memorial com `oculto` ou
  //    com a busca desligada. Ou seja: a família que escondia o próprio
  //    memorial se trancava do lado de fora, mesmo sabendo a senha. Aqui o
  //    servidor procura por nome SEM filtro de privacidade e confere a senha
  //    de cada candidato -- só devolve alguma coisa quando a senha bate, então
  //    ninguém descobre a existência de um memorial escondido sem já ter a
  //    senha dele.
  let candidatos: { id: string; slug: string | null }[] = []

  if (slug) {
    const { data } = await supabaseAdmin
      .from('homenagens')
      .select('id, slug')
      .eq('slug', slug)
      .single()
    if (data) candidatos = [data]
  } else {
    const { data } = await supabaseAdmin
      .from('homenagens')
      .select('id, slug')
      .ilike('nome_completo', (nome as string).trim())
      // Rascunho nunca é destino de login -- não tem família por trás ainda.
      .not('slug', 'like', 'rascunho-%')
      .limit(20)
    candidatos = data || []
  }

  if (candidatos.length === 0) {
    return NextResponse.json({ ok: false, error: slug ? 'Memorial não encontrado' : ERRO_GENERICO }, { status: 404 })
  }

  // Só a senha (decisão do Rafael, 2026-08-17): a senha JA chega por e-mail no
  // endereco cadastrado da familia, entao exigir o e-mail de novo na tela era
  // repetir o mesmo fator e travava familia que nao lembrava qual e-mail foi
  // cadastrado. Quem protege contra forca bruta aqui e o rate limit de login
  // do proxy.ts (3/min por IP em /api/familia-login).
  //
  // Homônimo é caso real (dois "José da Silva" no mesmo cemitério): por isso
  // percorre todos os candidatos, e entra no que a senha abrir.
  for (const homenagem of candidatos) {
    const { data: seguranca } = await supabaseAdmin
      .from('homenagens_seguranca')
      .select('senha_familia_hash')
      .eq('homenagem_id', homenagem.id)
      .maybeSingle()

    if (!seguranca?.senha_familia_hash) continue
    if (!verificarSenhaMemorial(homenagem.id, senha, seguranca.senha_familia_hash)) continue

    const token = criarTokenFamilia(homenagem.id, seguranca.senha_familia_hash)
    const res = NextResponse.json({ ok: true, slug: homenagem.slug })
    res.cookies.set(`familia_${homenagem.id}`, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    })
    return res
  }

  // Pelo slug a família já sabia qual memorial era, então "Senha incorreta"
  // não entrega nada que ela não soubesse. Pelo nome, resposta genérica.
  return NextResponse.json(
    { ok: false, error: slug ? 'Senha incorreta' : ERRO_GENERICO },
    { status: 401 }
  )
}
