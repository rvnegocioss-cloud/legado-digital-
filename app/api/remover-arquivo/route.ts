/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { identificarChamador, type Chamador } from '@/lib/autorizacaoEquipe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Remoção de arquivo dos campos que NÃO são mídia de memorial.
 *
 * Mídia de memorial (foto, vídeo, galeria) já tem rota própria
 * (/api/memorial-remover-midia), porque a permissão dela é o tripé
 * staff/parceiro-dono/família e depende do memorial. Aqui ficam os campos de
 * arquivo do resto do sistema.
 *
 * É um registro, não uma rota por campo: campo de arquivo novo entra
 * acrescentando uma linha em RECURSOS. Antes desta rota, o único jeito de tirar
 * um logo era subir outro por cima — o antigo ficava no servidor pra sempre,
 * ocupando espaço e acessível a quem tivesse a URL.
 */

interface Recurso {
  tabela: string
  coluna: string
  /** Toda pasta desse recurso começa assim. Trava contra apagar arquivo de outro dono. */
  pasta: (id: string) => string
  /** Colunas extras zeradas junto, quando o arquivo era prova de alguma coisa. */
  aoLimpar?: Record<string, unknown>
  autorizar: (quem: Chamador, id: string, linha: any) => boolean
}

const RECURSOS: Record<string, Recurso> = {
  logo_parceiro: {
    tabela: 'parceiros_b2b',
    coluna: 'logo_url',
    pasta: (id) => `parceiro-logos/${id}/`,
    // Staff mexe em qualquer parceiro; o parceiro mexe só no próprio logo
    // (regra 22 — parceiro nunca alcança dado de outro parceiro).
    autorizar: (quem, id) => quem.ehStaff || quem.parceiroIds.includes(id),
  },
  foto_tumulo: {
    tabela: 'lapides',
    coluna: 'foto_face_url',
    pasta: () => 'tumulos/',
    // A foto é a ÚNICA prova de que alguém esteve no túmulo (drone nadir nunca
    // mostra a face gravada). Tirando a foto, a conferência perde o lastro —
    // deixar 'confirmada' sem foto seria o mapa afirmando algo que não pode
    // mais sustentar.
    aoLimpar: { situacao: 'nao_confirmada', confirmada_em: null, confirmada_por: null },
    // Só staff: geometria de cemitério é compartilhada entre parceiros, e o
    // Portal do Parceiro abre o mapa em modo leitura justamente por isso.
    autorizar: (quem) => quem.ehStaff,
  },
}

const MARCADOR = '/object/public/memoriais/'
const MARCADOR_GATE = '/api/midia/'

/** Extrai o caminho dentro do balde, aceitando tanto a URL antiga quanto a do portão. */
function caminhoDoArquivo(url: string): string | null {
  for (const marcador of [MARCADOR, MARCADOR_GATE]) {
    const i = url.indexOf(marcador)
    if (i >= 0) {
      try {
        return decodeURIComponent(url.slice(i + marcador.length).split('?')[0])
      } catch {
        return url.slice(i + marcador.length).split('?')[0]
      }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const { recurso, id } = (await req.json()) as { recurso?: string; id?: string }

  if (!recurso || !id || !(recurso in RECURSOS)) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const def = RECURSOS[recurso]
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const quem = await identificarChamador(req, supabaseAdmin)
  if (!quem) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: linha } = await supabaseAdmin
    .from(def.tabela)
    .select(`id, ${def.coluna}`)
    .eq('id', id)
    .maybeSingle()

  if (!linha) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

  if (!def.autorizar(quem, id, linha)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const urlAtual = (linha as any)[def.coluna] as string | null
  if (!urlAtual) return NextResponse.json({ ok: true, jaEstavaVazio: true })

  const caminho = caminhoDoArquivo(urlAtual)

  // Trava de dono: o arquivo tem que estar na pasta desse registro. Sem isso,
  // um parceiro conseguiria apagar arquivo de outro só mandando o id certo com
  // a URL errada.
  const pastaEsperada = def.pasta(id)
  if (caminho && !caminho.startsWith(pastaEsperada)) {
    return NextResponse.json({ error: 'Arquivo não pertence a este registro' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from(def.tabela)
    .update({ [def.coluna]: null, ...(def.aoLimpar || {}) })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Storage só depois do banco: se a ordem fosse inversa e a gravação falhasse,
  // a tela ficaria apontando pra arquivo que já não existe.
  if (caminho) {
    await supabaseAdmin.storage.from('memoriais').remove([caminho])
  }

  return NextResponse.json({ ok: true })
}
