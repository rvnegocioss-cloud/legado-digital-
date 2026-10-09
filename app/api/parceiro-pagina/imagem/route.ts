import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { identificarChamador } from '@/lib/autorizacaoEquipe'
import {
  REGRAS_IMAGEM,
  lerDimensoes,
  validarDimensoes,
  validarPeso,
  type TipoImagemParceiro,
} from '@/lib/paginaParceiro'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Logo e capa da página do parceiro, em 2 passos (mesmo desenho do upload da
// família -- a Vercel corta requisição acima de ~4,5 MB, então o arquivo nunca
// passa por dentro do Next):
//
//   etapa "preparar"  -> confere permissão e peso, devolve URL assinada
//   (navegador envia o arquivo direto pro Storage)
//   etapa "confirmar" -> lê o arquivo que chegou, confere o TAMANHO DA IMAGEM
//                        nos bytes de verdade e só então grava na coluna
//
// Imagem abaixo do mínimo é apagada do Storage e recusada com o tamanho que
// ela tem. A conferência é feita aqui e não só no navegador porque checagem de
// navegador qualquer um pula.
//
// Os dois arquivos ficam em parceiro-logos/<id>/ -- pasta que o portão de
// mídia (/api/midia) já serve sem gate de memorial (logo comercial não pertence
// a memorial nenhum) e que /api/remover-arquivo já sabe apagar.

const PASTA = (id: string) => `parceiro-logos/${id}/`
const MARCADOR = '/object/public/memoriais/'

function ehTipo(v: unknown): v is TipoImagemParceiro {
  return v === 'logo' || v === 'capa'
}

export async function POST(req: NextRequest) {
  const corpo = (await req.json()) as Record<string, unknown>
  const { etapa, parceiroId, tipo } = corpo as { etapa?: string; parceiroId?: string; tipo?: unknown }

  if (!parceiroId || !ehTipo(tipo) || (etapa !== 'preparar' && etapa !== 'confirmar')) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const quem = await identificarChamador(req, supabaseAdmin)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!quem.ehStaff && !quem.parceiroIds.includes(parceiroId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const regra = REGRAS_IMAGEM[tipo]

  if (etapa === 'preparar') {
    const tamanho = Number(corpo.tamanho)
    const mime = String(corpo.mime || '')
    if (!tamanho || !regra.mimes.includes(mime)) {
      const aceitos = regra.mimes.map((m) => m.replace('image/', '').toUpperCase()).join(', ')
      return NextResponse.json({ error: `Formato não aceito. ${regra.rotulo} precisa ser ${aceitos}.` }, { status: 415 })
    }
    const pesado = validarPeso(tipo, tamanho)
    if (pesado) return NextResponse.json({ error: pesado }, { status: 413 })

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const caminho = `${PASTA(parceiroId)}${tipo}-${Date.now()}.${ext}`
    const { data, error } = await supabaseAdmin.storage.from('memoriais').createSignedUploadUrl(caminho)
    if (error || !data) return NextResponse.json({ error: error?.message || 'Não foi possível preparar o envio' }, { status: 500 })
    return NextResponse.json({ caminho, token: data.token })
  }

  // ---- confirmar ----
  const caminho = String(corpo.caminho || '')
  // Trava de dono: só confirma arquivo da pasta deste parceiro e deste tipo.
  if (!caminho.startsWith(`${PASTA(parceiroId)}${tipo}-`) || caminho.includes('..')) {
    return NextResponse.json({ error: 'Arquivo não pertence a este parceiro' }, { status: 403 })
  }

  const { data: arquivo, error: erroBaixar } = await supabaseAdmin.storage.from('memoriais').download(caminho)
  if (erroBaixar || !arquivo) return NextResponse.json({ error: 'O arquivo não chegou. Tente enviar de novo.' }, { status: 400 })

  const recusar = async (mensagem: string, status = 422) => {
    await supabaseAdmin.storage.from('memoriais').remove([caminho])
    return NextResponse.json({ error: mensagem }, { status })
  }

  const pesado = validarPeso(tipo, arquivo.size)
  if (pesado) return recusar(pesado, 413)

  const dim = lerDimensoes(new Uint8Array(await arquivo.arrayBuffer()))
  if (!dim || !regra.mimes.includes(dim.mime)) {
    const aceitos = regra.mimes.map((m) => m.replace('image/', '').toUpperCase()).join(', ')
    return recusar(`Esse arquivo não é uma imagem válida. ${regra.rotulo} precisa ser ${aceitos}.`, 415)
  }
  const fora = validarDimensoes(tipo, dim.largura, dim.altura)
  if (fora) return recusar(fora)

  const { data: antes } = await supabaseAdmin
    .from('parceiros_b2b')
    .select(`id, ${regra.coluna}`)
    .eq('id', parceiroId)
    .maybeSingle()
  if (!antes) return recusar('Parceiro não encontrado', 404)

  const { data: publica } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  const { error } = await supabaseAdmin
    .from('parceiros_b2b')
    .update({ [regra.coluna]: publica.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', parceiroId)
  if (error) return recusar(error.message, 500)

  // A imagem anterior sai do Storage só depois de a nova estar gravada.
  const urlAntiga = (antes as Record<string, unknown>)[regra.coluna] as string | null
  const i = urlAntiga ? urlAntiga.indexOf(MARCADOR) : -1
  if (urlAntiga && i >= 0) {
    const caminhoAntigo = decodeURIComponent(urlAntiga.slice(i + MARCADOR.length).split('?')[0])
    if (caminhoAntigo.startsWith(PASTA(parceiroId)) && caminhoAntigo !== caminho) {
      await supabaseAdmin.storage.from('memoriais').remove([caminhoAntigo])
    }
  }

  return NextResponse.json({ ok: true, url: publica.publicUrl, largura: dim.largura, altura: dim.altura })
}
