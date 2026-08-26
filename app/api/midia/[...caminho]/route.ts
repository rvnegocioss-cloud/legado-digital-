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

  // Pastas que NÃO são mídia de família: foto de túmulo e QR Code (operacionais
  // da equipe) e logo de parceiro (identidade comercial, aparece na página
  // pública da funerária). Nenhuma delas pertence a um memorial, então não tem
  // gate de memorial pra aplicar.
  //
  // 'parceiro-logos' entrou aqui em 26/08: quando o balde virou privado (18/08),
  // o logo continuou sendo montado com getPublicUrl e passou a responder 400 --
  // ou seja, sumiu de todas as telas sem ninguém perceber, porque nenhum teste
  // olhava pra ele.
  const ehArquivoSemMemorial =
    memorialId === 'tumulos' || memorialId === 'qrcodes' || memorialId === 'parceiro-logos'

  if (!ehArquivoSemMemorial) {
    const { data: memorial } = await supabaseAdmin
      .from('homenagens')
      .select('id, slug, foto_url, video_url, galeria_fotos, videos_galeria')
      .eq('id', memorialId)
      .maybeSingle()

    if (!memorial) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const { data: seguranca } = await supabaseAdmin
      .from('homenagens_seguranca')
      .select('modo_gate, gate_versao, senha_familia_hash')
      .eq('homenagem_id', memorial.id)
      .maybeSingle()

    const modo = seguranca?.modo_gate ?? 'aberto'

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

    // O arquivo ainda pertence ao memorial?
    //
    // Deixar passar qualquer caminho embaixo do id do memorial significa que
    // foto removida da página continua sendo entregue pra quem guardou a URL —
    // e que arquivo órfão (subido e nunca vinculado) também. A remoção tira a
    // mídia do banco ANTES de apagar o arquivo, então essa checagem faz a
    // decisão da família valer no mesmo instante, sem depender de o arquivo já
    // ter sumido do Storage nem de cache nenhum expirar.
    //
    // Equipe e família passam sem isso de propósito: na Central e no Portal do
    // Parceiro a foto vai pro Storage e só entra no banco quando alguém clica
    // em Salvar — exigir vínculo aqui deixaria a prévia quebrada antes do save.
    const ehEquipeAqui = verificarPasseMidiaEquipe(req.cookies.get(COOKIE_MIDIA_EQUIPE)?.value)
    const ehFamiliaAqui = verificarTokenFamilia(
      req.cookies.get(`familia_${memorial.id}`)?.value,
      memorial.id,
      seguranca?.senha_familia_hash
    )

    if (!ehEquipeAqui && !ehFamiliaAqui) {
      const referenciadas = new Set(
        [
          memorial.foto_url,
          memorial.video_url,
          ...(memorial.galeria_fotos ?? []),
          ...(memorial.videos_galeria ?? []),
        ]
          .filter((u): u is string => typeof u === 'string' && u.length > 0)
          .map((u) => {
            const bruto = u.split('/memoriais/')[1] ?? u
            try {
              return decodeURIComponent(bruto.split('?')[0])
            } catch {
              return bruto.split('?')[0]
            }
          })
      )

      if (!referenciadas.has(objeto)) {
        return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
      }
    }
  }

  // Busca com cache-buster, e não pelo SDK.
  //
  // Achado testando (18/08): o CDN do Supabase (plano Free, sem invalidação
  // automática) responde HIT pra objeto JÁ APAGADO, e ignora `Cache-Control:
  // no-cache` tanto na resposta quanto no pedido. Só query nova faz BYPASS e
  // mostra a verdade (400/404). Sem isso, arquivo apagado seguia sendo servido
  // pelo nosso portão por até uma hora — o portão está certo, o andar de baixo
  // é que mentia pra ele.
  const resposta = await fetch(
    `${supabaseUrl}/storage/v1/object/memoriais/${encodeURI(objeto)}?v=${Date.now()}`,
    {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store',
    }
  )
  if (!resposta.ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const data = await resposta.arrayBuffer()

  return new NextResponse(data, {
    headers: {
      'Content-Type': resposta.headers.get('content-type') || 'application/octet-stream',
      // Memorial protegido NUNCA é cacheado.
      //
      // Achado testando de verdade (18/08): com `private, max-age=3600` a borda
      // continuava servindo o arquivo por uma hora depois de ele ser APAGADO --
      // e serviria também depois de a família trancar o memorial. Permissão
      // checada a cada requisição não vale nada se a resposta fica guardada.
      //
      // Memorial aberto pode cachear (é público mesmo), e aí ganha velocidade.
      // Sem cache, para memorial nenhum.
      //
      // Testei as duas alternativas e as duas vazam: com `private, max-age` a
      // borda da Vercel guardou assim mesmo (servia arquivo já apagado), e com
      // cache só pro memorial aberto sobrava uma janela — a família tranca o
      // memorial e a foto segue sendo entregue até o cache expirar.
      //
      // Privacidade que depende de quando o cache vence não é privacidade.
      // O custo é uma ida ao servidor por imagem; o ganho é a decisão da
      // família valendo no mesmo segundo.
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      'Content-Disposition': 'inline',
      Vary: 'Cookie',
    },
  })
}
