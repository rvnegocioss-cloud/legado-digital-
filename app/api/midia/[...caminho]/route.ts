import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarTokenAcessoMemorial } from '@/lib/acessoMemorialSessao'
import { verificarTokenFamilia } from '@/lib/familiaSessao'
import { verificarPasseMidiaEquipe, COOKIE_MIDIA_EQUIPE } from '@/lib/sessaoMidiaEquipe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Portão único da mídia do memorial.
//
// Antes: balde público. O gate (senha, lista de e-mails, oculto) travava a
// PÁGINA, mas as fotos seguiam abertas pra qualquer um com a URL — a
// privacidade que a família escolhe não valia pros arquivos, só pra tela.
//
// Agora todo arquivo passa por aqui, e a permissão é checada a cada
// requisição: memorial aberto serve pra todo mundo; memorial protegido exige
// o mesmo cookie de acesso que libera a página, ou sessão da família/equipe.
//
// Escolhi portão em vez de URL assinada porque URL assinada é permissão
// congelada: depois que a família tranca o memorial, todo link assinado antes
// continuaria valendo até expirar.
export async function GET(req: NextRequest, ctx: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await ctx.params
  const objeto = caminho.map(decodeURIComponent).join('/')

  // Primeiro segmento é o id do memorial (padrão de todo upload nosso).
  const memorialId = caminho[0]
  if (!memorialId || memorialId.includes('..')) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Foto de túmulo (pasta 'tumulos/...') é operacional da equipe, não mídia de
  // família — não tem gate de memorial, então segue o fluxo antigo.
  const ehTumulo = memorialId === 'tumulos' || memorialId === 'qrcodes'
  let memorialProtegido = false

  if (!ehTumulo) {
    const { data: memorial } = await supabaseAdmin
      .from('homenagens')
      .select('id, slug')
      .eq('id', memorialId)
      .maybeSingle()

    if (!memorial) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const { data: seguranca } = await supabaseAdmin
      .from('homenagens_seguranca')
      .select('modo_gate, gate_versao, senha_familia_hash')
      .eq('homenagem_id', memorial.id)
      .maybeSingle()

    const modo = seguranca?.modo_gate ?? 'aberto'
    memorialProtegido = modo !== 'aberto'

    if (modo !== 'aberto') {
      const cookieAcesso = req.cookies.get(`mem_acesso_${memorial.slug}`)?.value
      const temAcessoVisitante = verificarTokenAcessoMemorial(
        cookieAcesso,
        memorial.id,
        modo as never,
        seguranca?.gate_versao ?? 1
      )

      const cookieFamilia = req.cookies.get(`familia_${memorial.id}`)?.value
      const ehFamilia = verificarTokenFamilia(cookieFamilia, memorial.id, seguranca?.senha_familia_hash)

      // Equipe/parceiro: passe de mídia trocado pela credencial do painel
      // (tag <img> não manda cabeçalho de autenticação).
      const ehEquipe = verificarPasseMidiaEquipe(req.cookies.get(COOKIE_MIDIA_EQUIPE)?.value)

      if (!temAcessoVisitante && !ehFamilia && !ehEquipe) {
        // Mesma resposta de arquivo inexistente: não confirma nem desmente que
        // o memorial existe (mesmo padrão anti-enumeração do resto do sistema).
        return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      }
    }
  }

  const { data, error } = await supabaseAdmin.storage.from('memoriais').download(objeto)
  if (error || !data) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      // Memorial protegido NUNCA é cacheado.
      //
      // Achado testando de verdade (18/08): com `private, max-age=3600` a borda
      // continuava servindo o arquivo por uma hora depois de ele ser APAGADO --
      // e serviria também depois de a família trancar o memorial. Permissão
      // checada a cada requisição não vale nada se a resposta fica guardada.
      //
      // Memorial aberto pode cachear (é público mesmo), e aí ganha velocidade.
      'Cache-Control': memorialProtegido
        ? 'private, no-store, no-cache, must-revalidate, max-age=0'
        : 'public, max-age=600, stale-while-revalidate=60',
      'Content-Disposition': 'inline',
      ...(memorialProtegido ? { Vary: 'Cookie' } : {}),
    },
  })
}
