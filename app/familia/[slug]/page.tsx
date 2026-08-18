'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'
import { VinculosEditor } from '@/components/admin/VinculosEditor'
import { PrivacidadeFamilia } from '@/components/familia/PrivacidadeFamilia'
import { PALETAS_MEMORIAL } from '@/lib/temasMemorial'
import { supabase } from '@/lib/auth'
import { useTravaEdicao, rotuloPapel } from '@/lib/useTravaEdicao'
import type { ModoGate } from '@/lib/modosPrivacidade'

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  frase_preferida: string | null
  biografia: string | null
  foto_url: string | null
  video_url: string | null
  videos_galeria: string[] | null
  galeria_fotos: string[] | null
  tema: string
  timeline: { year?: string; title?: string; description?: string }[] | null
  vinculos: string[] | null
  slug: string | null
  preenchido_por: 'funeraria' | 'familia' | null
  updated_at: string
}

const LIMITE_FOTOS = 4
const LIMITE_VIDEOS = 4

interface ResultadoUpload {
  url: string
  updatedAt?: string
  galeria?: string[]
  videosGaleria?: string[]
}

// Resposta de erro nem sempre e JSON: quando a plataforma corta a requisicao
// (arquivo grande demais, gateway), o corpo vem em texto puro e o JSON.parse
// estourava com "Unexpected token 'R'" na cara da familia.
async function lerResposta(res: Response) {
  const texto = await res.text()
  try {
    return JSON.parse(texto)
  } catch {
    if (res.status === 413) return { error: 'Arquivo grande demais para enviar.' }
    return { error: texto.slice(0, 120) || `Falha na conexão (código ${res.status}).` }
  }
}

async function subirArquivoFamilia(
  slug: string,
  pasta: 'foto' | 'video' | 'galeria' | 'videos_galeria',
  file: File
): Promise<ResultadoUpload> {
  // Etapa 1: pede permissao e uma URL assinada (requisicao minuscula, so JSON)
  const resPrep = await fetch('/api/familia-upload/preparar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, pasta, tamanho: file.size, nome: file.name }),
  })
  const prep = await lerResposta(resPrep)
  if (!resPrep.ok) throw new Error(prep.error || 'Não consegui preparar o envio.')

  // Etapa 2: o arquivo vai DIRETO pro Storage, sem limite de tamanho da Vercel
  const { error: erroUpload } = await supabase.storage
    .from('memoriais')
    .uploadToSignedUrl(prep.caminho, prep.token, file)
  if (erroUpload) throw new Error('Falha ao enviar o arquivo. Verifique sua conexão e tente de novo.')

  // Etapa 3: confere o arquivo de verdade e ja grava no memorial
  const resConf = await fetch('/api/familia-upload/confirmar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, pasta, caminho: prep.caminho }),
  })
  const conf = await lerResposta(resConf)
  if (!resConf.ok) throw new Error(conf.error || 'Erro ao salvar o arquivo no memorial.')

  return conf as ResultadoUpload
}

function chaveRascunho(slug: string) {
  return `legado-rascunho-familia-${slug}`
}

export default function FamiliaEdicaoPage() {
  const params = useParams<{ slug: string }>()
  const [carregando, setCarregando] = useState(true)
  const [sessaoInvalida, setSessaoInvalida] = useState(false)
  const [erroCarregar, setErroCarregar] = useState('')

  const [form, setForm] = useState({
    nome_completo: '',
    data_nascimento: '',
    data_falecimento: '',
    cidade: '',
    frase_preferida: '',
    biografia: '',
  })
  const [fotoUrl, setFotoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videosGaleria, setVideosGaleria] = useState<string[]>([])
  const [tema, setTema] = useState('navy')
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineEventos, setTimelineEventos] = useState<TimelineEvento[]>([])
  const [vinculos, setVinculos] = useState<string[]>([])

  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [salvoEm, setSalvoEm] = useState<Date | null>(null)
  // Conflito pendente: para o auto-save e mostra as duas versoes pra pessoa
  // escolher. Nunca sobrescreve sozinho nem descarta o que ela escreveu.
  const [conflito, setConflito] = useState<{ campos: string[]; doServidor: Record<string, unknown> } | null>(null)
  // Trava simples pra nao disparar duas gravacoes ao mesmo tempo (o auto-save
  // e o clique no botao brigando seria conflito criado por nos mesmos).
  const salvandoRef = useRef(false)
  const primeiroRenderRef = useRef(true)
  const ultimoSalvoRef = useRef(0)
  const [erro, setErro] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoVideosGaleria, setEnviandoVideosGaleria] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [updatedAtCarregado, setUpdatedAtCarregado] = useState('')
  // Valores como estavam no servidor quando a tela carregou. O salvar manda
  // isso junto pro servidor comparar CAMPO A CAMPO -- sem isso, qualquer
  // escrita no memorial (ate o upload da propria familia) bloqueava tudo.
  const [valoresBase, setValoresBase] = useState<Record<string, unknown>>({})
  // Rede de protecao: tudo o que a familia digita e guardado no proprio
  // navegador a cada tecla. Se o salvar falhar, se cair a internet ou se ela
  // fechar a aba sem querer, o texto continua la quando voltar.
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false)
  // Presenca ao vivo: avisa NA HORA se alguem mais esta no mesmo memorial,
  // em vez de a pessoa descobrir so no Salvar, meia hora de texto depois.
  const { outros, temOutroEditando } = useTravaEdicao(params.slug)
  const [usoStorageMB, setUsoStorageMB] = useState(0)
  const [preenchidoPor, setPreenchidoPor] = useState<'funeraria' | 'familia' | null>(null)
  const [memorialId, setMemorialId] = useState('')
  const [modoGate, setModoGate] = useState<ModoGate>('aberto')
  const [buscaHabilitada, setBuscaHabilitada] = useState(true)
  const [linkHabilitado, setLinkHabilitado] = useState(true)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(true)
  const [temSenhaAcesso, setTemSenhaAcesso] = useState(false)

  useEffect(() => {
    if (params.slug) carregar(params.slug)
  }, [params.slug])

  async function carregar(slug: string) {
    setCarregando(true)
    const res = await fetch(`/api/familia-memorial?slug=${encodeURIComponent(slug)}`)
    const json = await res.json()

    if (!res.ok) {
      if (res.status === 401) setSessaoInvalida(true)
      else setErroCarregar(json.error || 'Erro ao carregar memorial')
      setCarregando(false)
      return
    }

    const m = json.memorial as Memorial
    setUpdatedAtCarregado(m.updated_at)
    setPreenchidoPor(m.preenchido_por)
    setMemorialId(m.id)
    setModoGate((json.privacidade?.modoGate ?? 'aberto') as ModoGate)
    setBuscaHabilitada(json.privacidade?.buscaHabilitada ?? true)
    setLinkHabilitado(json.privacidade?.linkHabilitado ?? true)
    setQrcodeHabilitado(json.privacidade?.qrcodeHabilitado ?? true)
    setTemSenhaAcesso(!!json.privacidade?.temSenhaAcesso)
    fetch(`/api/memorial-storage-usage?memorialId=${m.id}`)
      .then((r) => r.json())
      .then((j) => setUsoStorageMB(Math.round((j.usageBytes || 0) / 1024 / 1024)))
      .catch(() => {})
    setForm({
      nome_completo: m.nome_completo || '',
      data_nascimento: m.data_nascimento || '',
      data_falecimento: m.data_falecimento || '',
      cidade: m.cidade || '',
      frase_preferida: m.frase_preferida || '',
      biografia: m.biografia || '',
    })
    setFotoUrl(m.foto_url || '')
    setVideoUrl(m.video_url || '')
    setGaleria(m.galeria_fotos || [])
    setVideosGaleria(m.videos_galeria || [])
    setTema(m.tema || 'navy')
    setVinculos(m.vinculos || [])
    setTimelineEventos(
      (m.timeline || []).map((ev) => ({
        year: ev.year || '',
        title: ev.title || '',
        description: ev.description || '',
      }))
    )
    // Rascunho local sempre vence o que veio do servidor na EXIBICAO -- e o
    // trabalho mais recente da familia. A base de comparacao continua sendo o
    // servidor, entao o salvar segue detectando conflito de verdade.
    try {
      const bruto = localStorage.getItem(chaveRascunho(params.slug))
      if (bruto) {
        const r = JSON.parse(bruto)
        if (r?.dados) {
          setForm({
            nome_completo: r.dados.nome_completo ?? m.nome_completo ?? '',
            data_nascimento: r.dados.data_nascimento ?? m.data_nascimento ?? '',
            data_falecimento: r.dados.data_falecimento ?? m.data_falecimento ?? '',
            cidade: r.dados.cidade ?? m.cidade ?? '',
            frase_preferida: r.dados.frase_preferida ?? m.frase_preferida ?? '',
            biografia: r.dados.biografia ?? m.biografia ?? '',
          })
          if (Array.isArray(r.dados.timeline)) setTimelineEventos(r.dados.timeline)
          if (Array.isArray(r.dados.vinculos)) setVinculos(r.dados.vinculos)
          if (r.dados.tema) setTema(r.dados.tema)
          setRascunhoRestaurado(true)
        }
      }
    } catch {}

    setValoresBase({
      nome_completo: m.nome_completo,
      data_nascimento: m.data_nascimento,
      data_falecimento: m.data_falecimento,
      cidade: m.cidade,
      frase_preferida: m.frase_preferida,
      biografia: m.biografia,
      foto_url: m.foto_url,
      video_url: m.video_url,
      videos_galeria: m.videos_galeria,
      galeria_fotos: m.galeria_fotos,
      timeline: m.timeline,
      vinculos: m.vinculos,
      tema: m.tema,
    })
    setCarregando(false)
  }

  // Guarda o que esta na tela no proprio navegador. Nao substitui o salvar --
  // e a rede pra que texto digitado nunca se perca por conflito, queda de
  // internet ou aba fechada sem querer.
  useEffect(() => {
    if (carregando || sessaoInvalida) return
    try {
      localStorage.setItem(
        chaveRascunho(params.slug),
        JSON.stringify({
          salvoEm: new Date().toISOString(),
          dados: { ...form, tema, vinculos, timeline: timelineEventos },
        })
      )
    } catch {
      // navegador sem espaco ou em modo privado -- rascunho e bonus, nunca bloqueia
    }
  }, [form, tema, vinculos, timelineEventos, carregando, sessaoInvalida, params.slug])

  // Salva sozinho 2,5s depois que a pessoa para de digitar. E o que fecha o
  // problema de raiz: nada fica pendente esperando o botao, entao nao existe
  // janela pra conflito, nem pra perder texto por aba fechada ou queda.
  useEffect(() => {
    if (carregando || sessaoInvalida || erroCarregar || conflito) return
    if (primeiroRenderRef.current) {
      primeiroRenderRef.current = false
      return
    }
    const desdeUltimo = Date.now() - ultimoSalvoRef.current
    // Espera 3s parado; se acabou de gravar, espera completar 8s -- digitação
    // em rajada não pode virar dezenas de gravações por minuto (estoura rate
    // limit e escreve no banco à toa).
    const espera = Math.max(3000, 8000 - desdeUltimo)
    const t = setTimeout(() => {
      ultimoSalvoRef.current = Date.now()
      salvar(undefined, true)
    }, espera)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, tema, vinculos, timelineEventos, fotoUrl, videoUrl, galeria, videosGaleria])

  const ROTULO_CAMPO: Record<string, string> = {
    nome_completo: 'Nome completo',
    data_nascimento: 'Data de nascimento',
    data_falecimento: 'Data de falecimento',
    cidade: 'Cidade',
    frase_preferida: 'Frase preferida',
    biografia: 'Biografia',
    timeline: 'Linha do tempo',
    vinculos: 'Vínculo/papel',
    tema: 'Tema da página',
    foto_url: 'Foto do homenageado',
    video_url: 'Vídeo',
    galeria_fotos: 'Galeria de fotos',
    videos_galeria: 'Galeria de vídeos',
  }

  // Mantém o texto da família e passa a considerar a versão do servidor como
  // base -- o próximo salvamento grava o dela por cima, com consentimento.
  function manterMeuTexto() {
    if (!conflito) return
    setValoresBase((b) => ({ ...b, ...conflito.doServidor }))
    setConflito(null)
    setTimeout(() => salvar(undefined, true), 100)
  }

  // Descarta o que a família escreveu NAQUELE campo e adota o do servidor.
  function usarVersaoDoServidor() {
    if (!conflito) return
    const s = conflito.doServidor as Record<string, any>
    setForm((f) => ({
      ...f,
      ...(('biografia' in s) ? { biografia: (s.biografia as string) || '' } : {}),
      ...(('nome_completo' in s) ? { nome_completo: (s.nome_completo as string) || '' } : {}),
      ...(('cidade' in s) ? { cidade: (s.cidade as string) || '' } : {}),
      ...(('frase_preferida' in s) ? { frase_preferida: (s.frase_preferida as string) || '' } : {}),
      ...(('data_nascimento' in s) ? { data_nascimento: (s.data_nascimento as string) || '' } : {}),
      ...(('data_falecimento' in s) ? { data_falecimento: (s.data_falecimento as string) || '' } : {}),
    }))
    if ('timeline' in s) setTimelineEventos((s.timeline as TimelineEvento[]) || [])
    if ('vinculos' in s) setVinculos((s.vinculos as string[]) || [])
    if ('tema' in s) setTema((s.tema as string) || 'navy')
    if ('galeria_fotos' in s) setGaleria((s.galeria_fotos as string[]) || [])
    if ('videos_galeria' in s) setVideosGaleria((s.videos_galeria as string[]) || [])
    setValoresBase((b) => ({ ...b, ...conflito.doServidor }))
    setConflito(null)
  }

  function descartarRascunho() {
    try {
      localStorage.removeItem(chaveRascunho(params.slug))
    } catch {}
    setRascunhoRestaurado(false)
    carregar(params.slug)
  }

  async function salvar(e?: React.FormEvent, silencioso = false) {
    e?.preventDefault()
    if (salvandoRef.current) return
    salvandoRef.current = true
    if (!silencioso) setSalvando(true)
    setErro('')
    setSalvo(false)

    const res = await fetch('/api/familia-memorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: params.slug,
        updatedAtEsperado: updatedAtCarregado,
        valoresBase,
        ...form,
        foto_url: fotoUrl || null,
        video_url: videoUrl || null,
        videos_galeria: videosGaleria,
        galeria_fotos: galeria,
        tema,
        timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
        vinculos: vinculos.length > 0 ? vinculos : null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      if (res.status === 401) setSessaoInvalida(true)

      // Conflito de verdade: busca a versao do servidor e mostra as duas, em
      // vez de deixar a pessoa presa numa mensagem vermelha sem saida.
      if (res.status === 409 && Array.isArray(json.camposEmConflito)) {
        try {
          const atual = await fetch(`/api/familia-memorial?slug=${params.slug}`)
          const dadosAtuais = await atual.json()
          const doServidor: Record<string, unknown> = {}
          for (const campo of json.camposEmConflito) {
            doServidor[campo] = (dadosAtuais.memorial as Record<string, unknown>)?.[campo]
          }
          setConflito({ campos: json.camposEmConflito, doServidor })
          setErro('')
        } catch {
          setErro(json.error || 'Erro ao salvar')
        }
      } else {
        setErro(json.error || 'Erro ao salvar')
      }

      setSalvando(false)
      salvandoRef.current = false
      return
    }

    if (json.updatedAt) setUpdatedAtCarregado(json.updatedAt)
    // O que acabou de ser gravado vira a nova base de comparacao -- senao o
    // segundo salvar seguido acusaria conflito com a propria alteracao.
    setValoresBase({
      nome_completo: form.nome_completo,
      data_nascimento: form.data_nascimento,
      data_falecimento: form.data_falecimento,
      cidade: form.cidade,
      frase_preferida: form.frase_preferida,
      biografia: form.biografia,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      videos_galeria: videosGaleria,
      galeria_fotos: galeria,
      timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
      vinculos: vinculos.length > 0 ? vinculos : null,
      tema,
    })
    try {
      localStorage.removeItem(chaveRascunho(params.slug))
    } catch {}
    setRascunhoRestaurado(false)
    setSalvando(false)
    salvandoRef.current = false
    setSalvoEm(new Date())
    setSalvo(true)
    setErro('')
    setConflito(null)
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoFoto(true)
    setErro('')
    try {
      const r = await subirArquivoFamilia(params.slug, 'foto', file)
      setFotoUrl(r.url)
      setValoresBase((b) => ({ ...b, foto_url: r.url }))
      // O arquivo ja foi gravado no memorial pela rota de confirmar -- sincronizar
      // o updated_at aqui evita o falso "outra pessoa alterou" no proximo Salvar.
      if (r.updatedAt) setUpdatedAtCarregado(r.updatedAt)
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoFoto(false)
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoVideo(true)
    setErro('')
    try {
      const r = await subirArquivoFamilia(params.slug, 'video', file)
      setVideoUrl(r.url)
      setValoresBase((b) => ({ ...b, video_url: r.url }))
      if (r.updatedAt) setUpdatedAtCarregado(r.updatedAt)
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoVideo(false)
  }

  async function handleVideosGaleriaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const vagas = LIMITE_VIDEOS - videosGaleria.length
    if (vagas <= 0) {
      setErro(`Limite de ${LIMITE_VIDEOS} vídeos por memorial atingido.`)
      e.target.value = ''
      return
    }
    const selecionados = files.slice(0, vagas)
    setEnviandoVideosGaleria(true)
    setErro('')
    try {
      for (const f of selecionados) {
        const r = await subirArquivoFamilia(params.slug, 'videos_galeria', f)
        if (r.videosGaleria) {
          setVideosGaleria(r.videosGaleria)
          setValoresBase((b) => ({ ...b, videos_galeria: r.videosGaleria }))
        }
        if (r.updatedAt) setUpdatedAtCarregado(r.updatedAt)
      }
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoVideosGaleria(false)
    e.target.value = ''
  }

  // Remove de verdade: some da tela, sai do memorial no banco e o arquivo e
  // apagado do servidor (nao fica ocupando cota nem acessivel por URL).
  async function removerMidia(tipo: 'foto' | 'video' | 'galeria' | 'videos_galeria', url?: string) {
    setErro('')
    const res = await fetch('/api/memorial-remover-midia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: params.slug, tipo, url }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErro(json.error || 'Não consegui remover o arquivo.')
      return
    }
    if (tipo === 'foto') setFotoUrl('')
    if (tipo === 'video') setVideoUrl('')
    if (json.galeria) setGaleria(json.galeria)
    if (json.videosGaleria) setVideosGaleria(json.videosGaleria)
    if (json.updatedAt) setUpdatedAtCarregado(json.updatedAt)
    setValoresBase((b) => ({
      ...b,
      foto_url: json.foto_url ?? b.foto_url,
      video_url: json.video_url ?? b.video_url,
      galeria_fotos: json.galeria ?? b.galeria_fotos,
      videos_galeria: json.videosGaleria ?? b.videos_galeria,
    }))
  }

  function removerVideoGaleria(url: string) {
    removerMidia('videos_galeria', url)
  }

  async function handleGaleriaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const vagas = LIMITE_FOTOS - galeria.length
    if (vagas <= 0) {
      setErro(`Limite de ${LIMITE_FOTOS} fotos por memorial atingido.`)
      e.target.value = ''
      return
    }
    const selecionados = files.slice(0, vagas)
    setEnviandoGaleria(true)
    setErro('')
    try {
      for (const f of selecionados) {
        const r = await subirArquivoFamilia(params.slug, 'galeria', f)
        if (r.galeria) {
          setGaleria(r.galeria)
          setValoresBase((b) => ({ ...b, galeria_fotos: r.galeria }))
        }
        if (r.updatedAt) setUpdatedAtCarregado(r.updatedAt)
      }
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoGaleria(false)
    e.target.value = ''
  }

  function removerFoto(url: string) {
    removerMidia('galeria', url)
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    )
  }

  if (sessaoInvalida) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white mb-3">Sua sessão expirou ou a senha mudou.</p>
          <Link href="/familia/login" className="text-blue-400 hover:underline text-sm">
            Entrar de novo →
          </Link>
        </div>
      </div>
    )
  }

  if (erroCarregar) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-red-400">{erroCarregar}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/familia/login" className="text-sm text-zinc-400 hover:text-white">
          ← Sair
        </Link>

        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-xl font-bold text-white">Editar memorial de {form.nome_completo}</h1>
          <a
            href={`/homenagem/${params.slug}`}
            className="text-blue-400 hover:underline text-xs whitespace-nowrap"
          >
            Ver página →
          </a>
        </div>

        {preenchidoPor === 'funeraria' && (
          <p className="text-xs text-blue-300 bg-blue-900/20 border border-blue-900/40 rounded-lg px-3 py-2 mb-4">
            A funerária está preenchendo esse memorial por você. Você ainda pode editar aqui a
            qualquer momento se preferir.
          </p>
        )}

        {temOutroEditando && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-200 font-medium">
              {rotuloPapel(outros[0].papel)} está editando este memorial agora
              {outros[0].quem ? ` (${outros[0].quem})` : ''}.
            </p>
            <p className="text-xs text-red-300/80 mt-1">
              Evite mexer no mesmo campo ao mesmo tempo. O que você escrever fica guardado aqui no seu
              navegador, mas quem salvar por último pode esbarrar no outro.
            </p>
          </div>
        )}

        {rascunhoRestaurado && (
          <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-900/15 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-amber-200">
              Recuperei o que você tinha escrito e ainda não estava salvo. Confira e clique em
              &quot;Salvar alterações&quot;.
            </p>
            <button
              type="button"
              onClick={descartarRascunho}
              className="text-xs px-2 py-1 rounded border border-amber-900/50 text-amber-200 hover:bg-amber-900/30"
            >
              Descartar e usar a versão salva
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <form onSubmit={salvar} className="lg:col-span-7 rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Nome completo</label>
              <input
                type="text"
                required
                value={form.nome_completo}
                onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Data de nascimento</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">Data de falecimento</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={form.data_falecimento}
                  onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Vínculo/papel (ex: Pai, Avó — aparece perto do nome na página)</label>
              <VinculosEditor value={vinculos} onChange={setVinculos} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Frase preferida</label>
              <input
                type="text"
                value={form.frase_preferida}
                onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Biografia</label>
              <textarea
                rows={4}
                value={form.biografia}
                onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
              />
            </div>

            <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />

            {conflito && (
              <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 space-y-2">
                <p className="text-sm text-amber-200 font-medium">
                  {conflito.campos.map((c) => ROTULO_CAMPO[c] || c).join(', ')}: outra pessoa mudou isso enquanto
                  você escrevia.
                </p>
                <p className="text-[11px] text-amber-200/70">
                  Nada foi perdido — o que você escreveu continua aqui na tela. Escolha o que fica:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={manterMeuTexto}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                  >
                    Manter o meu e salvar
                  </button>
                  <button
                    type="button"
                    onClick={usarVersaoDoServidor}
                    className="px-3 py-1.5 rounded-lg border border-amber-800/60 text-amber-200 hover:bg-amber-900/30 text-sm"
                  >
                    Ver e usar a versão que está salva
                  </button>
                </div>
              </div>
            )}

            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <p className="text-xs text-zinc-500">
              {salvando
                ? 'Salvando...'
                : salvoEm
                  ? `Salvo automaticamente às ${salvoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'As alterações são salvas sozinhas enquanto você escreve.'}
            </p>
            {salvo && <p className="text-green-400 text-sm">Salvo.</p>}

            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg"
            >
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>

          <div className="lg:col-span-5 space-y-4">
            {memorialId && (
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Privacidade</h2>
                <PrivacidadeFamilia
                  memorialId={memorialId}
                  modoGateInicial={modoGate}
                  buscaHabilitadaInicial={buscaHabilitada}
                  linkHabilitadoInicial={linkHabilitado}
                  qrcodeHabilitadoInicial={qrcodeHabilitado}
                  temSenhaAcessoInicial={temSenhaAcesso}
                />
              </div>
            )}

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Fotos, vídeos e aparência</h2>
          <div className="pb-4 border-b border-zinc-800 mb-4">
            <p className="text-xs text-zinc-500">Armazenamento: {usoStorageMB}MB / 500MB</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    usoStorageMB < 250 ? 'bg-green-500' : usoStorageMB < 400 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (usoStorageMB / 500) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Foto do homenageado (máx 10MB)</label>
            <p className="text-xs text-zinc-400 mb-2">JPEG, PNG ou GIF</p>
            {fotoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="" className="w-24 h-24 rounded-full object-cover mb-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              disabled={enviandoFoto}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600"
            />
            {enviandoFoto && <p className="text-xs text-zinc-500 mt-1">Enviando foto...</p>}
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Vídeo (máx 50MB)</label>
            <p className="text-xs text-zinc-400 mb-2">MP4, WebM ou QuickTime</p>
            {videoUrl && <video src={videoUrl} controls className="w-full rounded-md mb-2 max-h-48 bg-black" />}
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              disabled={enviandoVideo}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600"
            />
            {enviandoVideo && <p className="text-xs text-zinc-500 mt-1">Enviando vídeo...</p>}
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Galeria de vídeos ({videosGaleria.length}/{LIMITE_VIDEOS})
            </label>
            <p className="text-xs text-zinc-400 mb-2">Até {LIMITE_VIDEOS} vídeos além do vídeo principal, máx 100MB cada</p>
            {videosGaleria.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {videosGaleria.map((url) => (
                  <div key={url} className="relative group">
                    <video src={url} controls className="w-full h-24 object-cover rounded bg-black" />
                    <button
                      type="button"
                      onClick={() => removerVideoGaleria(url)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideosGaleriaChange}
              disabled={enviandoVideosGaleria || videosGaleria.length >= LIMITE_VIDEOS}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600 disabled:opacity-50"
            />
            {enviandoVideosGaleria && <p className="text-xs text-zinc-500 mt-1">Enviando vídeos...</p>}
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tema da página pública</label>
            <p className="text-xs text-zinc-400 mb-2">Cor de fundo e detalhes dourados da página do memorial</p>
            <div className="flex gap-2">
              {PALETAS_MEMORIAL.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTema(p.id)}
                  title={p.nome}
                  className={`w-8 h-8 rounded-full ${tema === p.id ? 'ring-2 ring-white' : 'ring-1 ring-zinc-700'}`}
                  style={{ background: `linear-gradient(135deg, ${p.fundoBase} 50%, ${p.dourado} 50%)` }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Galeria de fotos ({galeria.length}/{LIMITE_FOTOS})
            </label>
            <p className="text-xs text-zinc-400 mb-2">Até {LIMITE_FOTOS} fotos, máx 10MB cada</p>
            {galeria.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {galeria.map((url) => (
                  <div key={url} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-16 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removerFoto(url)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGaleriaChange}
              disabled={enviandoGaleria || galeria.length >= LIMITE_FOTOS}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600 disabled:opacity-50"
            />
            {enviandoGaleria && <p className="text-xs text-zinc-500 mt-1">Enviando fotos...</p>}
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
