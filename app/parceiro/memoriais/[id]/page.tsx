'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  User,
  FileText,
  Images,
  Milestone,
  UserCog,
  Mail,
  Lock,
  QrCode,
  Signpost,
  MessageSquare,
  BookOpen,
} from 'lucide-react'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { gerarSlugUnico } from '@/lib/gerarSlug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'
import { CampoFicha } from '@/components/admin/CampoFicha'
import { SecaoFicha } from '@/components/admin/SecaoFicha'
import { PrivacidadeMemorial } from '@/components/admin/PrivacidadeMemorial'
import { StatusFicha } from '@/components/admin/StatusFicha'
import { VinculosEditor } from '@/components/admin/VinculosEditor'
import { PALETAS_MEMORIAL } from '@/lib/temasMemorial'
import { urlMidiaProtegida } from '@/lib/urlMidia'

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  frase_preferida: string | null
  biografia: string | null
  slug: string | null
  foto_url: string | null
  video_url: string | null
  videos_galeria: string[] | null
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
  qr_code_url: string | null
  mensagem_placa: string | null
  familia_email: string | null
  familia_nome_responsavel: string | null
  familia_telefone: string | null
  preenchido_por: 'funeraria' | 'familia' | null
  tema: string
  lapide_id: string | null
  vinculos: string[] | null
  created_at: string
  updated_at: string
}

interface Cemiterio {
  id: string
  nome: string
}

interface Lapide {
  id: string
  identificacao: string
  codigo: string | null
  cemiterio_id: string
  fila_id: string | null
  quadras: { numero: number } | null
  filas: { numero: number } | null
  homenagens: { id: string }[]
}

const LIMITE_FOTOS = 4 // MVP — revisar conforme plano de storage contratado
const LIMITE_VIDEOS = 4 // mesma conta do CHECK videos_galeria_max_4 no banco

async function subirArquivo(memorialId: string, pasta: 'foto' | 'video' | 'galeria' | 'videos_galeria', file: File) {
  const caminho = `${memorialId}/${pasta}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('memoriais').upload(caminho, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('memoriais').getPublicUrl(caminho)
  return data.publicUrl
}

// Apaga o arquivo antigo do Storage a partir da URL pública — sem isso, todo
// upload novo (nome tem timestamp) deixa o arquivo anterior órfão pra sempre.
async function removerArquivoStorage(url: string) {
  const marcador = '/storage/v1/object/public/memoriais/'
  const idx = url.indexOf(marcador)
  if (idx === -1) return
  const caminho = url.slice(idx + marcador.length)
  await supabase.storage.from('memoriais').remove([caminho])
}

export default function FichaMemorialParceiro() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <FichaMemorialParceiroInner />
    </Suspense>
  )
}

function FichaMemorialParceiroInner() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const suffix = parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''

  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [form, setForm] = useState({
    nome_completo: '',
    data_nascimento: '',
    data_falecimento: '',
    cidade: '',
    frase_preferida: '',
    biografia: '',
    lapide_id: '',
  })
  const [vinculos, setVinculos] = useState<string[]>([])
  const [cemiterios, setCemiterios] = useState<Cemiterio[]>([])
  const [lapides, setLapides] = useState<Lapide[]>([])
  const [cemiterioSelecionadoId, setCemiterioSelecionadoId] = useState('')
  const [confirmoVinculoLapide, setConfirmoVinculoLapide] = useState(false)
  const [fotoUrl, setFotoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videosGaleria, setVideosGaleria] = useState<string[]>([])
  const [tema, setTema] = useState('navy')
  const [enviandoVideosGaleria, setEnviandoVideosGaleria] = useState(false)
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineEventos, setTimelineEventos] = useState<TimelineEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [erro, setErro] = useState('')
  const [usoStorageMB, setUsoStorageMB] = useState(0)
  const [senha, setSenha] = useState('')
  const [temSenha, setTemSenha] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaMsg, setSenhaMsg] = useState('')
  const [temSenhaFamilia, setTemSenhaFamilia] = useState(false)
  const [familiaEmail, setFamiliaEmail] = useState('')
  const [familiaNomeResponsavel, setFamiliaNomeResponsavel] = useState('')
  const [familiaTelefone, setFamiliaTelefone] = useState('')
  const [familiaCpf, setFamiliaCpf] = useState('')
  const [consultandoCpf, setConsultandoCpf] = useState(false)
  const [cpfMsg, setCpfMsg] = useState('')
  const [cpfModoTeste, setCpfModoTeste] = useState(false)
  const [cadastrandoFamiliaEmail, setCadastrandoFamiliaEmail] = useState(false)
  const [familiaEmailMsg, setFamiliaEmailMsg] = useState('')
  const [preenchidoPor, setPreenchidoPor] = useState<'funeraria' | 'familia'>('familia')
  const [salvandoPreenchidoPor, setSalvandoPreenchidoPor] = useState(false)
  const [mural, setMural] = useState<{ id: string; nome: string; parentesco: string | null; texto: string; created_at: string }[]>([])
  const [removendoMuralId, setRemovendoMuralId] = useState<string | null>(null)
  const [condolencias, setCondolencias] = useState<{ id: string; visitor_name: string; message: string; created_at: string }[]>([])
  const [removendoCondolenciaId, setRemovendoCondolenciaId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gerandoQrCode, setGerandoQrCode] = useState(false)
  const [qrCodeMsg, setQrCodeMsg] = useState('')
  const [mensagemPlaca, setMensagemPlaca] = useState('')
  const [salvandoMensagemPlaca, setSalvandoMensagemPlaca] = useState(false)
  const [mensagemPlacaMsg, setMensagemPlacaMsg] = useState('')
  const [mensagemPlacaConfirmada, setMensagemPlacaConfirmada] = useState(false)
  const [envioFornecedorStatus, setEnvioFornecedorStatus] = useState<'enviado' | 'erro' | null>(null)

  // Passe de mídia: a tag <img> não manda credencial, então memorial protegido
  // apareceria quebrado aqui. A página troca a sessão por um cookie curto.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch('/api/midia-sessao', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {})
    })
  }, [])

  useEffect(() => {
    if (params.id) load(params.id)
  }, [params.id])

  // Dropdown de lapide so carrega as do cemiterio escolhido -- nunca todas de
  // uma vez (mesmo motivo do load() acima, teto de 1000 linhas do PostgREST).
  useEffect(() => {
    if (!cemiterioSelecionadoId) return
    supabase
      .from('lapides')
      .select('id, identificacao, codigo, cemiterio_id, fila_id, quadras(numero), filas(numero), homenagens(id)')
      .eq('cemiterio_id', cemiterioSelecionadoId)
      .limit(5000)
      .then(({ data }) => {
        setLapides((atual) => {
          const semEsseCemiterio = atual.filter((l) => l.cemiterio_id !== cemiterioSelecionadoId)
          return [...semEsseCemiterio, ...((data as unknown as Lapide[]) || [])]
        })
      })
  }, [cemiterioSelecionadoId])

  async function load(id: string) {
    setLoading(true)

    // Mesma checagem do resto do Portal do Parceiro: ?parceiro_id= só vale
    // se quem está logado é staff de verdade, senão um parceiro comum
    // poderia editar a URL e abrir a ficha de memorial de outra empresa
    // (leitura de homenagens é pública no banco).
    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    const { data: m } = await supabase
      .from('homenagens')
      .select(
        'id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, slug, foto_url, video_url, videos_galeria, galeria_fotos, timeline, qr_code_url, mensagem_placa, familia_email, familia_nome_responsavel, familia_telefone, preenchido_por, tema, lapide_id, vinculos, parceiro_id, created_at, updated_at'
      )
      .eq('id', id)
      .maybeSingle()

    if (!m || !meuParceiroId || m.parceiro_id !== meuParceiroId) {
      setMemorial(null)
      setLoading(false)
      return
    }

    const { data: cemiteriosData } = await supabase.from('cemiterios').select('id, nome').order('nome')
    setCemiterios(cemiteriosData || [])

    // Nunca carregar lapides de todos os cemiterios de uma vez (estoura o teto
    // de 1000 linhas do PostgREST silenciosamente em cemiterio grande) --
    // busca so a lapide ja vinculada (se tiver), resto carrega filtrado
    // quando o parceiro escolhe o cemiterio (useEffect abaixo).
    let lapidesData: Lapide[] = []
    if (m.lapide_id) {
      const { data: lapideAtual } = await supabase
        .from('lapides')
        .select('id, identificacao, codigo, cemiterio_id, fila_id, quadras(numero), filas(numero), homenagens(id)')
        .eq('id', m.lapide_id)
        .single()
      if (lapideAtual) {
        const lapideTipada = lapideAtual as unknown as Lapide
        lapidesData = [lapideTipada]
        setCemiterioSelecionadoId(lapideTipada.cemiterio_id)
      }
    }
    setLapides(lapidesData)

    setMemorial(m)
    setForm({
      nome_completo: m.nome_completo,
      data_nascimento: m.data_nascimento || '',
      data_falecimento: m.data_falecimento || '',
      cidade: m.cidade || '',
      frase_preferida: m.frase_preferida || '',
      biografia: m.biografia || '',
      lapide_id: m.lapide_id || '',
    })
    setVinculos(m.vinculos || [])
    setFotoUrl(m.foto_url || '')
    setVideoUrl(m.video_url || '')
    setVideosGaleria(m.videos_galeria || [])
    setGaleria(m.galeria_fotos || [])
    setTema(m.tema || 'navy')
    setTimelineEventos(
      (m.timeline || []).map((ev: { year?: string; title?: string; description?: string }) => ({
        year: ev.year || '',
        title: ev.title || '',
        description: ev.description || '',
      }))
    )
    setQrCodeUrl(m.qr_code_url || '')
    setMensagemPlaca(m.mensagem_placa || '')
    setFamiliaEmail(m.familia_email || '')
    setFamiliaNomeResponsavel(m.familia_nome_responsavel || '')
    setFamiliaTelefone(m.familia_telefone || '')
    setPreenchidoPor(m.preenchido_por || 'familia')

    const { data: seguranca } = await supabase
      .from('homenagens_seguranca')
      .select('senha_acesso_hash, senha_familia_hash, mensagem_placa_confirmada')
      .eq('homenagem_id', m.id)
      .maybeSingle()
    setTemSenha(!!seguranca?.senha_acesso_hash)
    setTemSenhaFamilia(!!seguranca?.senha_familia_hash)
    setMensagemPlacaConfirmada(!!seguranca?.mensagem_placa_confirmada)

    // Fase real do envio pro fornecedor da placa — sem isso a Central/Parceiro
    // não tem como saber se o e-mail com o QR realmente saiu ou travou (ex:
    // e-mail do fornecedor sem cadastrar, erro de SMTP).
    const { data: envioFornecedorData } = await supabase
      .from('emails_enviados')
      .select('status')
      .eq('homenagem_id', m.id)
      .eq('tipo', 'envio_fornecedor')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setEnvioFornecedorStatus((envioFornecedorData?.status as 'enviado' | 'erro' | undefined) ?? null)

    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(`/api/memorial-storage-usage?memorialId=${m.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then((r) => r.json())
        .then((json) => setUsoStorageMB(Math.round((json.usageBytes || 0) / 1024 / 1024)))
        .catch(() => {})
    )

    const { data: muralData } = await supabase
      .from('mural_memorias')
      .select('id, nome, parentesco, texto, created_at')
      .eq('homenagem_id', m.id)
      .order('created_at', { ascending: false })
    setMural(muralData || [])

    const { data: condolenciasData } = await supabase
      .from('condolencias')
      .select('id, visitor_name, message, created_at')
      .eq('homenagem_id', m.id)
      .order('created_at', { ascending: false })
    setCondolencias(condolenciasData || [])

    setLoading(false)
  }

  async function removerMemoria(id: string) {
    setRemovendoMuralId(id)
    await supabase.from('mural_memorias').delete().eq('id', id)
    setMural((atual) => atual.filter((mem) => mem.id !== id))
    setRemovendoMuralId(null)
  }

  async function removerCondolencia(id: string) {
    setRemovendoCondolenciaId(id)
    await supabase.from('condolencias').delete().eq('id', id)
    setCondolencias((atual) => atual.filter((c) => c.id !== id))
    setRemovendoCondolenciaId(null)
  }

  async function salvarPreenchidoPor(valor: 'funeraria' | 'familia') {
    if (!memorial) return
    setPreenchidoPor(valor)
    setSalvandoPreenchidoPor(true)
    const { data: atualizado } = await supabase
      .from('homenagens')
      .update({ preenchido_por: valor })
      .eq('id', memorial.id)
      .select('updated_at')
      .single()
    if (atualizado?.updated_at) {
      setMemorial((atual) => (atual ? { ...atual, updated_at: atualizado.updated_at } : atual))
    }
    setSalvandoPreenchidoPor(false)
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!memorial) return
    setSalvandoSenha(true)
    setSenhaMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/memorial-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: memorial.id, senha, tipo: 'acesso' }),
    })
    const json = await res.json()

    if (!res.ok) {
      setSenhaMsg(json.error || 'Erro ao salvar senha')
    } else {
      setTemSenha(json.temSenha)
      setSenha('')
      setSenhaMsg(json.temSenha ? 'Senha definida.' : 'Senha removida — memorial público de novo.')
    }
    setSalvandoSenha(false)
  }

  async function cadastrarEmailFamilia(e: React.FormEvent) {
    e.preventDefault()
    if (!memorial) return
    const nomeMemorial = form.nome_completo.trim()
    if (!nomeMemorial || nomeMemorial === 'Novo memorial') {
      setFamiliaEmailMsg('Preenche o nome do homenageado antes de enviar acesso — o e-mail pra família cita esse nome.')
      return
    }
    setCadastrandoFamiliaEmail(true)
    setFamiliaEmailMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/cadastrar-email-familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        memorialId: memorial.id,
        email: familiaEmail,
        nome: familiaNomeResponsavel,
        telefone: familiaTelefone,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setFamiliaEmailMsg(json.error || 'Erro ao cadastrar')
    } else if (json.emailEnviado) {
      setFamiliaEmailMsg('Cadastrado — e-mail com a senha de acesso enviado pra família.')
      setTemSenhaFamilia(true)
    } else {
      setFamiliaEmailMsg(`Cadastrado, mas o e-mail não saiu. Senha gerada: ${json.senha} — repasse manualmente.`)
      setTemSenhaFamilia(true)
    }
    if (json.updatedAt) {
      setMemorial((atual) => (atual ? { ...atual, updated_at: json.updatedAt } : atual))
    }
    setCadastrandoFamiliaEmail(false)
  }

  async function salvarMensagemPlaca(e: React.FormEvent) {
    e.preventDefault()
    if (!memorial) return
    setSalvandoMensagemPlaca(true)
    setMensagemPlacaMsg('')
    setMensagemPlacaConfirmada(false)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/salvar-mensagem-placa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: memorial.id, mensagem: mensagemPlaca }),
    })
    const json = await res.json()

    if (!res.ok) {
      setMensagemPlacaMsg(json.error || 'Erro ao salvar mensagem')
    } else if (json.aviso) {
      setMensagemPlacaMsg(json.aviso)
    } else if (json.emailConfirmacaoEnviado) {
      setMensagemPlacaMsg('Salvo — e-mail de confirmação enviado pra família. O fornecedor só recebe depois que ela confirmar.')
    } else if (mensagemPlaca.trim()) {
      setMensagemPlacaMsg('Salvo, mas o e-mail de confirmação não saiu.')
    } else {
      setMensagemPlacaMsg('Salvo — sem mensagem, o QR Code segue direto pro fornecedor.')
    }
    if (json.updatedAt) {
      setMemorial((atual) => (atual ? { ...atual, updated_at: json.updatedAt } : atual))
    }
    setSalvandoMensagemPlaca(false)
  }

  async function gerarQrCode() {
    if (!memorial) return
    const nome = form.nome_completo.trim()
    if (!nome || nome === 'Novo memorial') {
      setQrCodeMsg('Preenche o nome de verdade antes — esse QR dispara pedido pro fornecedor da placa física, precisa saber de quem é.')
      return
    }
    if (!form.data_falecimento.trim()) {
      setQrCodeMsg('Preenche a data de falecimento antes — vai junto no pedido pro fornecedor da placa física.')
      return
    }
    setQrCodeMsg('')
    setGerandoQrCode(true)
    const { qrCodeUrl, updatedAt } = await gerarQrCodeCliente(memorial.id)
    if (qrCodeUrl) setQrCodeUrl(qrCodeUrl)
    if (updatedAt) setMemorial((atual) => (atual ? { ...atual, updated_at: updatedAt } : atual))
    setGerandoQrCode(false)
  }

  async function consultarCpf() {
    if (!memorial) return
    setConsultandoCpf(true)
    setCpfMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/consultar-cpf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ cpf: familiaCpf, memorialId: memorial.id }),
    })
    const json = await res.json()

    if (!res.ok) {
      setCpfMsg(json.error || 'Erro ao consultar CPF')
    } else {
      setFamiliaNomeResponsavel(json.nome || '')
      setCpfModoTeste(!!json.modoTeste)
      setCpfMsg(json.modoTeste ? 'Preenchido — dado fictício (modo teste, sem token de produção).' : 'Preenchido.')
    }
    setConsultandoCpf(false)
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !memorial) return
    setEnviandoFoto(true)
    setErro('')
    try {
      const url = await subirArquivo(memorial.id, 'foto', file)
      setFotoUrl(url)
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar foto')
    }
    setEnviandoFoto(false)
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !memorial) return
    setEnviandoVideo(true)
    setErro('')
    try {
      const url = await subirArquivo(memorial.id, 'video', file)
      setVideoUrl(url)
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar vídeo')
    }
    setEnviandoVideo(false)
  }

  async function handleVideosGaleriaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !memorial) return

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
      const urls = await Promise.all(selecionados.map((f) => subirArquivo(memorial.id, 'videos_galeria', f)))
      setVideosGaleria((atual) => [...atual, ...urls])
      if (files.length > selecionados.length) {
        setErro(`Só cabiam mais ${vagas} vídeo(s) — limite de ${LIMITE_VIDEOS} por memorial.`)
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar vídeos')
    }
    setEnviandoVideosGaleria(false)
    e.target.value = ''
  }

  function removerVideoGaleria(url: string) {
    setVideosGaleria((atual) => atual.filter((u) => u !== url))
    removerMidiaDoServidor('videos_galeria', url)
  }

  async function handleGaleriaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !memorial) return

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
      const urls = await Promise.all(selecionados.map((f) => subirArquivo(memorial.id, 'galeria', f)))
      setGaleria((atual) => [...atual, ...urls])
      if (files.length > selecionados.length) {
        setErro(`Só cabiam mais ${vagas} foto(s) — limite de ${LIMITE_FOTOS} por memorial.`)
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar fotos')
    }
    setEnviandoGaleria(false)
    e.target.value = ''
  }

  // Remove de verdade: tira do memorial E apaga o arquivo do servidor. Antes so
  // sumia o link da tela -- arquivo seguia ocupando a cota de 500 MB e aberto
  // pra quem tivesse a URL.
  async function removerMidiaDoServidor(tipo: 'foto' | 'video' | 'galeria' | 'videos_galeria', url?: string) {
    if (!memorial?.slug) return
    const res = await fetch('/api/memorial-remover-midia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ slug: memorial.slug, tipo, url }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return
    if (tipo === 'foto') setFotoUrl('')
    if (tipo === 'video') setVideoUrl('')
    if (json.galeria) setGaleria(json.galeria)
    if (json.videosGaleria) setVideosGaleria(json.videosGaleria)
  }

  function removerFotoPrincipal() {
    setFotoUrl('')
    removerMidiaDoServidor('foto')
  }

  function removerVideo() {
    setVideoUrl('')
    removerMidiaDoServidor('video')
  }

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
    removerMidiaDoServidor('galeria', url)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!memorial) return
    setSalvando(true)
    setErro('')
    setSalvo(false)

    // Checa se a família (ou outro operador) mexeu nesse memorial desde que
    // essa tela abriu — sem isso, salvar aqui sobrescreve silenciosamente
    // qualquer alteração feita em paralelo, sem avisar nenhum dos dois lados.
    const { data: atual } = await supabase
      .from('homenagens')
      .select('updated_at')
      .eq('id', memorial.id)
      .single()
    if (atual && atual.updated_at !== memorial.updated_at) {
      setErro('Esse memorial foi alterado por outra pessoa (família ou a Central) desde que essa tela abriu. Recarregue a página antes de salvar, pra não sobrescrever a mudança dela.')
      setSalvando(false)
      return
    }

    if (form.lapide_id && form.lapide_id !== memorial.lapide_id) {
      const lapideEscolhida = lapides.find((l) => l.id === form.lapide_id)
      const arriscado = lapideEscolhida && (!lapideEscolhida.fila_id || lapideEscolhida.homenagens.length > 0)
      if (arriscado && !confirmoVinculoLapide) {
        setErro('Confirma o túmulo antes de salvar (caixa vermelha acima do formulário) -- esse túmulo está fora de fileira ou já tem memorial vinculado.')
        setSalvando(false)
        return
      }
    }

    // Rascunho nasce com slug "rascunho-<id8>" (pra poder criar a linha na
    // hora, sem pedir nome antes) e nunca virava definitivo em lugar nenhum
    // — o mesmo slug provisório ficava pra sempre, inclusive depois de
    // preencher o nome real. Troca aqui, no primeiro save com nome de
    // verdade: se já tiver QR gerado nesse ponto (não deveria, já que QR só
    // sai depois do nome real também), o slug do QR fica desatualizado —
    // aceitável hoje porque as duas travas nascem juntas a partir de agora.
    let slugDefinitivo: string | null = null
    const nomeParaSlug = form.nome_completo.trim()
    if (memorial.slug?.startsWith('rascunho-') && nomeParaSlug && nomeParaSlug !== 'Novo memorial') {
      slugDefinitivo = await gerarSlugUnico(supabase, nomeParaSlug, memorial.id)
    }

    const payload: Record<string, unknown> = {
      ...form,
      lapide_id: form.lapide_id || null,
      vinculos: vinculos.length > 0 ? vinculos : null,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      videos_galeria: videosGaleria,
      galeria_fotos: galeria,
      tema,
      timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
    }
    if (slugDefinitivo) {
      payload.slug = slugDefinitivo
      payload.memorial_slug = slugDefinitivo
    }
    const { data: atualizado, error } = await supabase
      .from('homenagens')
      .update(payload)
      .eq('id', memorial.id)
      .select('updated_at')
      .single()

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    const fotoAntiga = memorial.foto_url
    if (fotoAntiga && fotoAntiga !== fotoUrl) removerArquivoStorage(fotoAntiga)
    const videoAntigo = memorial.video_url
    if (videoAntigo && videoAntigo !== videoUrl) removerArquivoStorage(videoAntigo)
    const galeriaAntiga = memorial.galeria_fotos || []
    galeriaAntiga.filter((u) => !galeria.includes(u)).forEach(removerArquivoStorage)
    const videosGaleriaAntiga = memorial.videos_galeria || []
    videosGaleriaAntiga.filter((u) => !videosGaleria.includes(u)).forEach(removerArquivoStorage)

    // Só gera QR (e dispara e-mail pro fornecedor da placa) no primeiro save
    // real, com nome de verdade e data de falecimento preenchida — se já
    // existe QR, um "Salvar" de rotina (corrigir texto, nova foto) não pode
    // reenviar pedido de placa física de novo; sem nome/data, o fornecedor
    // não tem o mínimo pra colocar na placa, então nem dispara.
    const nomeRealParaQr = form.nome_completo.trim()
    if (
      !memorial.qr_code_url &&
      nomeRealParaQr &&
      nomeRealParaQr !== 'Novo memorial' &&
      form.data_falecimento.trim()
    ) {
      gerarQrCodeCliente(memorial.id).then(({ qrCodeUrl, updatedAt }) => {
        if (qrCodeUrl) setQrCodeUrl(qrCodeUrl)
        if (updatedAt) setMemorial((atual) => (atual ? { ...atual, updated_at: updatedAt } : atual))
      })
    }

    setSalvando(false)
    setSalvo(true)
    setMemorial({
      ...memorial,
      ...form,
      slug: slugDefinitivo || memorial.slug,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      videos_galeria: videosGaleria,
      galeria_fotos: galeria,
      tema,
      updated_at: atualizado?.updated_at || memorial.updated_at,
    })
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  if (!memorial) return <p className="text-[var(--tema-zinc-400)]">Memorial não encontrado.</p>

  const conteudoPreenchidoPelaFamilia = preenchidoPor === 'familia'

  // Fase real do envio pro fornecedor — raciocínio: sem mensagem, o QR já vai
  // sozinho assim que gerado; com mensagem, só vai depois da família confirmar.
  // "erro" cobre tanto falha de SMTP quanto e-mail do fornecedor não cadastrado.
  const placaChip = (() => {
    if (envioFornecedorStatus === 'erro') {
      return { label: 'Placa: erro no envio ao fornecedor', tom: 'vermelho' as const }
    }
    if (!mensagemPlaca.trim()) {
      return envioFornecedorStatus === 'enviado'
        ? { label: 'Placa: sem mensagem, enviada', tom: 'verde' as const }
        : { label: 'Placa: sem mensagem', tom: 'neutro' as const }
    }
    if (!mensagemPlacaConfirmada) {
      return { label: 'Placa: aguardando família confirmar', tom: 'amarelo' as const }
    }
    return envioFornecedorStatus === 'enviado'
      ? { label: 'Placa: confirmada, enviada ao fornecedor', tom: 'verde' as const }
      : { label: 'Placa: confirmada, enviando...', tom: 'amarelo' as const }
  })()

  const chipsStatus: { label: string; tom: 'neutro' | 'verde' | 'amarelo' | 'vermelho' }[] = [
    { label: temSenha ? 'Com senha' : 'Público', tom: temSenha ? 'amarelo' : 'verde' },
    { label: temSenhaFamilia ? 'Acesso da família enviado' : 'Acesso da família pendente', tom: temSenhaFamilia ? 'verde' : 'neutro' },
    { label: `Conteúdo: ${preenchidoPor === 'familia' ? 'Família' : 'Funerária'}`, tom: 'neutro' },
    { label: form.lapide_id ? 'Localização vinculada' : 'Sem localização (sem "Como Chegar")', tom: form.lapide_id ? 'verde' : 'amarelo' },
    placaChip,
    { label: `Galeria ${galeria.length}/${LIMITE_FOTOS}`, tom: 'neutro' },
    { label: `${usoStorageMB}MB / 500MB`, tom: usoStorageMB >= 400 ? 'amarelo' : 'neutro' },
  ]

  return (
    <div>
      <Link href={`/parceiro/memoriais${suffix}`} className="inline-flex items-center gap-1.5 text-sm text-[var(--tema-zinc-400)] hover:text-white">
        <ArrowLeft size={14} strokeWidth={1.5} />
        Voltar pra Meus Memoriais
      </Link>

      <div className="flex items-start justify-between mt-4 mb-2 gap-4">
        <h1 className="text-2xl font-bold text-white">{memorial.nome_completo}</h1>
        {memorial.slug && (
          <a
            href={`/homenagem/${memorial.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-branco-fixo text-sm font-medium whitespace-nowrap shrink-0"
          >
            Ver página do memorial
            <ExternalLink size={14} strokeWidth={1.5} />
          </a>
        )}
      </div>
      <StatusFicha chips={chipsStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
        <div className="lg:col-span-8 @container">
          <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6">
            <form onSubmit={salvar}>
              <SecaoFicha titulo="Identificação" icon={User} primeira>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="shrink-0">
                    <label className="block text-xs text-[var(--tema-zinc-400)] mb-1.5">Foto (máx 10MB)</label>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-[var(--tema-zinc-800)] overflow-hidden shrink-0">
                        {fotoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urlMidiaProtegida(fotoUrl) || fotoUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="input-foto-perfil"
                          className="text-[11px] text-[var(--tema-zinc-300)] hover:text-white bg-[var(--tema-zinc-800)] hover:bg-[var(--tema-zinc-700)] rounded-md px-2 py-1 cursor-pointer text-center"
                        >
                          {enviandoFoto ? 'Enviando...' : 'Enviar'}
                        </label>
                        <input
                          id="input-foto-perfil"
                          type="file"
                          accept="image/*"
                          onChange={handleFotoChange}
                          disabled={enviandoFoto}
                          className="hidden"
                        />
                        {fotoUrl && (
                          <button type="button" onClick={removerFotoPrincipal} className="text-[11px] text-[var(--tema-zinc-500)] hover:text-red-400">
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <CampoFicha label="Nome completo" className="flex-1 min-w-[220px]">
                    <Input
                      required
                      value={form.nome_completo}
                      onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                    />
                  </CampoFicha>
                  <CampoFicha label="Nascimento" className="w-36">
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={form.data_nascimento}
                      onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                    />
                  </CampoFicha>
                  <CampoFicha label="Falecimento" className="w-36">
                    <Input
                      placeholder="DD/MM/AAAA"
                      value={form.data_falecimento}
                      onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                    />
                  </CampoFicha>
                  <CampoFicha label="Cidade" className="w-44">
                    <Input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                    />
                  </CampoFicha>
                  <CampoFicha label="Cemitério" className="w-48" hint="Sem isso, 'Como Chegar' não aparece na página.">
                    <select
                      value={cemiterioSelecionadoId}
                      onChange={(e) => {
                        setCemiterioSelecionadoId(e.target.value)
                        setForm({ ...form, lapide_id: '' })
                      }}
                      className="flex h-9 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-1.5 text-sm text-white"
                    >
                      <option value="">Sem cemitério vinculado</option>
                      {cemiterios.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </CampoFicha>
                  <CampoFicha label="Lápide" className="w-48">
                    <select
                      value={form.lapide_id}
                      onChange={(e) => {
                        setForm({ ...form, lapide_id: e.target.value })
                        setConfirmoVinculoLapide(false)
                      }}
                      disabled={!cemiterioSelecionadoId}
                      className="flex h-9 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      <option value="">Sem lápide vinculada</option>
                      {(() => {
                        const doCemiterio = lapides.filter((l) => l.cemiterio_id === cemiterioSelecionadoId)
                        const comFileira = doCemiterio.filter((l) => l.fila_id)
                        const semFileira = doCemiterio.filter((l) => !l.fila_id)
                        const grupos = new Map<string, Lapide[]>()
                        comFileira.forEach((l) => {
                          const chave = `Quadra ${l.quadras?.numero ?? '?'} · Fileira ${l.filas?.numero ?? '?'}`
                          grupos.set(chave, [...(grupos.get(chave) || []), l])
                        })
                        return (
                          <>
                            {[...grupos.entries()].map(([chave, itens]) => (
                              <optgroup key={chave} label={chave}>
                                {itens.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.codigo || l.identificacao}
                                    {l.homenagens.length > 0 ? ` (já tem ${l.homenagens.length} memorial)` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                            {semFileira.length > 0 && (
                              <optgroup label="⚠ Fora de fileira — confirmar antes">
                                {semFileira.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.identificacao}
                                    {l.homenagens.length > 0 ? ` (já tem ${l.homenagens.length} memorial)` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )
                      })()}
                    </select>
                  </CampoFicha>
                </div>

                {(() => {
                  if (!form.lapide_id || form.lapide_id === memorial?.lapide_id) return null
                  const l = lapides.find((x) => x.id === form.lapide_id)
                  if (!l) return null
                  const arriscado = !l.fila_id || l.homenagens.length > 0
                  if (!arriscado) return null
                  return (
                    <div className="rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2 mt-3 space-y-2">
                      <p className="text-xs text-red-300">
                        {!l.fila_id && 'Esse túmulo está fora de fileira (sem quadra/fileira vinculada). '}
                        {l.homenagens.length > 0 && `Esse túmulo já tem ${l.homenagens.length} memorial(is) vinculado(s). `}
                        Confere se é o túmulo certo antes de salvar.
                      </p>
                      <label className="flex items-center gap-2 text-xs text-red-200">
                        <input type="checkbox" checked={confirmoVinculoLapide} onChange={(e) => setConfirmoVinculoLapide(e.target.checked)} />
                        Confirmo que este é o túmulo correto
                      </label>
                    </div>
                  )
                })()}

                <CampoFicha label="Vínculo/papel (aparece perto do nome na página)" className="mt-4">
                  <VinculosEditor value={vinculos} onChange={setVinculos} />
                </CampoFicha>
              </SecaoFicha>

              <SecaoFicha titulo="História" icon={FileText}>
                {conteudoPreenchidoPelaFamilia && (
                  <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-3 py-2 mb-3">
                    A família optou por preencher o conteúdo — evite sobrescrever o que ela já colocou. Isso é definido no card &quot;Quem preenche o conteúdo&quot;, ao lado.
                  </p>
                )}
                <div className="grid grid-cols-1 @lg:grid-cols-3 gap-4">
                  <CampoFicha label="Biografia" className="@lg:col-span-2">
                    <textarea
                      rows={10}
                      value={form.biografia}
                      onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                      className="flex w-full max-w-[72ch] rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)]"
                    />
                  </CampoFicha>
                  <CampoFicha label="Frase preferida">
                    <textarea
                      rows={3}
                      value={form.frase_preferida}
                      onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                      className="flex w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)]"
                    />
                  </CampoFicha>
                </div>
              </SecaoFicha>

              <SecaoFicha
                titulo="Galeria e vídeo"
                icon={Images}
                acao={
                  <div className="flex items-center gap-2 w-32">
                    <div className="flex-1 h-1.5 bg-[var(--tema-zinc-800)] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-colors ${
                          usoStorageMB < 250 ? 'bg-green-500' : usoStorageMB < 400 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (usoStorageMB / 500) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[var(--tema-zinc-400)] whitespace-nowrap">{usoStorageMB}MB/500MB</span>
                  </div>
                }
              >
                <div className="grid grid-cols-1 @lg:grid-cols-3 gap-4">
                  <CampoFicha label={`Galeria de fotos (${galeria.length}/${LIMITE_FOTOS})`} className="@lg:col-span-2">
                    {galeria.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
                        {galeria.map((url) => (
                          <div key={url} className="relative group aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={urlMidiaProtegida(url) || url} alt="" className="w-full h-full object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => removerFoto(url)}
                              aria-label="Remover foto"
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-400)]"
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
                      className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)] disabled:opacity-50"
                    />
                    {enviandoGaleria && <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">Enviando fotos...</p>}
                  </CampoFicha>
                  <CampoFicha label="Vídeo (máx 100MB)">
                    {videoUrl && (
                      <div className="mb-2">
                        <video src={urlMidiaProtegida(videoUrl) || videoUrl} controls className="w-full rounded-md max-h-40 bg-black" />
                        <button type="button" onClick={removerVideo} className="text-[11px] text-[var(--tema-zinc-500)] hover:text-red-400 mt-1">
                          Remover vídeo
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      disabled={enviandoVideo}
                      className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)]"
                    />
                    {enviandoVideo && <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">Enviando vídeo...</p>}
                  </CampoFicha>
                  <CampoFicha label={`Galeria de vídeos (${videosGaleria.length}/${LIMITE_VIDEOS})`} className="@lg:col-span-2">
                    {videosGaleria.length > 0 && (
                      <div className="grid grid-cols-2 @lg:grid-cols-4 gap-2 mb-2">
                        {videosGaleria.map((url) => (
                          <div key={url} className="relative group">
                            <video src={urlMidiaProtegida(url) || url} controls className="w-full h-20 object-cover rounded bg-black" />
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
                      className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)] disabled:opacity-50"
                    />
                    {enviandoVideosGaleria && <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">Enviando vídeos...</p>}
                  </CampoFicha>
                  <CampoFicha label="Tema da página pública" hint="Cor de fundo e detalhes dourados da página do memorial">
                    <div className="flex gap-2">
                      {PALETAS_MEMORIAL.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTema(p.id)}
                          title={p.nome}
                          className={`w-8 h-8 rounded-full ${tema === p.id ? 'ring-2 ring-white' : 'ring-1 ring-[var(--tema-zinc-700)]'}`}
                          style={{ background: `linear-gradient(135deg, ${p.fundoBase} 50%, ${p.dourado} 50%)` }}
                        />
                      ))}
                    </div>
                  </CampoFicha>
                </div>
              </SecaoFicha>

              <SecaoFicha titulo="Linha do tempo" icon={Milestone}>
                <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />
              </SecaoFicha>

              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-[var(--tema-zinc-800)]">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar memorial'}
                </Button>
                {erro && <p className="text-red-400 text-sm">{erro}</p>}
                {salvo && <p className="text-green-400 text-sm">Memorial salvo.</p>}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6">
            <SecaoFicha titulo="Quem preenche o conteúdo" icon={UserCog} primeira>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => salvarPreenchidoPor('familia')}
                  disabled={salvandoPreenchidoPor}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    preenchidoPor === 'familia'
                      ? 'border-blue-500/60 bg-blue-500/10 text-blue-300'
                      : 'border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-950)] text-[var(--tema-zinc-400)] hover:text-[var(--tema-zinc-200)]'
                  }`}
                >
                  A família preenche
                </button>
                <button
                  type="button"
                  onClick={() => salvarPreenchidoPor('funeraria')}
                  disabled={salvandoPreenchidoPor}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    preenchidoPor === 'funeraria'
                      ? 'border-blue-500/60 bg-blue-500/10 text-blue-300'
                      : 'border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-950)] text-[var(--tema-zinc-400)] hover:text-[var(--tema-zinc-200)]'
                  }`}
                >
                  Nós preenchemos
                </button>
              </div>
              {salvandoPreenchidoPor && <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1.5">Salvando...</p>}
            </SecaoFicha>

            <SecaoFicha titulo="Acesso da família" icon={Mail}>
              <form onSubmit={cadastrarEmailFamilia} className="space-y-3">
                <CampoFicha label="CPF do responsável (opcional, preenche o nome)">
                  <div className="flex gap-2">
                    <Input
                      placeholder="000.000.000-00"
                      value={familiaCpf}
                      onChange={(e) => setFamiliaCpf(e.target.value)}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white flex-1"
                    />
                    <Button type="button" onClick={consultarCpf} disabled={consultandoCpf} className="whitespace-nowrap">
                      {consultandoCpf ? '...' : 'Consultar'}
                    </Button>
                  </div>
                  {cpfMsg && (
                    <p className={`text-[11px] mt-1 ${cpfModoTeste ? 'text-yellow-400' : 'text-[var(--tema-zinc-400)]'}`}>{cpfMsg}</p>
                  )}
                </CampoFicha>
                <CampoFicha label="Nome do responsável">
                  <Input
                    value={familiaNomeResponsavel}
                    onChange={(e) => setFamiliaNomeResponsavel(e.target.value)}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </CampoFicha>
                <CampoFicha label="E-mail">
                  <Input
                    type="email"
                    placeholder="email@familia.com"
                    required
                    value={familiaEmail}
                    onChange={(e) => setFamiliaEmail(e.target.value)}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </CampoFicha>
                <CampoFicha label="Telefone">
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={familiaTelefone}
                    onChange={(e) => setFamiliaTelefone(e.target.value)}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </CampoFicha>
                <Button type="submit" disabled={cadastrandoFamiliaEmail} className="w-full">
                  {cadastrandoFamiliaEmail ? 'Enviando...' : temSenhaFamilia ? 'Reenviar acesso' : 'Enviar acesso'}
                </Button>
                {familiaEmailMsg && <p className="text-[11px] text-[var(--tema-zinc-400)]">{familiaEmailMsg}</p>}
              </form>
            </SecaoFicha>

            <SecaoFicha titulo="Senha da página pública" icon={Lock}>
              <form onSubmit={salvarSenha} className="space-y-2">
                <CampoFicha
                  label="Senha de acesso"
                  hint={temSenha ? 'Deixe em branco e salve pra tornar público de novo.' : 'Deixe em branco pra manter público.'}
                >
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Deixe em branco pra público"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white flex-1"
                    />
                    <Button type="submit" disabled={salvandoSenha}>
                      {salvandoSenha ? '...' : temSenha ? 'Atualizar' : 'Definir'}
                    </Button>
                  </div>
                </CampoFicha>
                {senhaMsg && <p className="text-[11px] text-[var(--tema-zinc-400)]">{senhaMsg}</p>}
              </form>
            </SecaoFicha>

            <SecaoFicha titulo="Privacidade — modos de acesso" icon={Lock}>
              {memorial && <PrivacidadeMemorial memorialId={memorial.id} />}
            </SecaoFicha>

            <SecaoFicha titulo="QR Code" icon={QrCode}>
              <div className="flex items-center gap-3">
                {qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeUrl} alt="" className="w-16 h-16 rounded bg-white p-1" />
                ) : (
                  <div className="w-16 h-16 rounded bg-[var(--tema-zinc-800)]" />
                )}
                <div className="flex flex-col gap-1">
                  {qrCodeUrl && (
                    <a href={qrCodeUrl} download={`qrcode-${memorial.slug}.png`} className="text-blue-400 hover:underline text-xs">
                      Baixar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={gerarQrCode}
                    disabled={gerandoQrCode}
                    className="text-[var(--tema-zinc-400)] hover:text-white text-xs text-left"
                  >
                    {gerandoQrCode ? 'Gerando...' : qrCodeUrl ? 'Atualizar' : 'Gerar'}
                  </button>
                </div>
              </div>
              {qrCodeMsg && <p className="text-[11px] text-yellow-400 mt-2">{qrCodeMsg}</p>}
            </SecaoFicha>

            <SecaoFicha titulo="Mensagem da placa" icon={Signpost}>
              <form onSubmit={salvarMensagemPlaca}>
                <textarea
                  rows={3}
                  placeholder="Ex: Em memória eterna de..."
                  value={mensagemPlaca}
                  onChange={(e) => setMensagemPlaca(e.target.value)}
                  className="flex w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)] mb-2"
                />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={salvandoMensagemPlaca}>
                    {salvandoMensagemPlaca ? 'Salvando...' : 'Salvar mensagem'}
                  </Button>
                  {mensagemPlaca.trim() && (
                    <span
                      className={`text-[11px] px-2 py-1 rounded ${
                        envioFornecedorStatus === 'erro'
                          ? 'bg-red-900/50 text-red-400'
                          : !mensagemPlacaConfirmada
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-green-900/50 text-green-400'
                      }`}
                    >
                      {envioFornecedorStatus === 'erro'
                        ? 'Erro ao enviar pro fornecedor'
                        : !mensagemPlacaConfirmada
                        ? 'Aguardando confirmação da família'
                        : envioFornecedorStatus === 'enviado'
                        ? 'Confirmado e enviado ao fornecedor'
                        : 'Confirmado pela família'}
                    </span>
                  )}
                </div>
                {mensagemPlacaMsg && <p className="text-[11px] text-[var(--tema-zinc-400)] mt-2">{mensagemPlacaMsg}</p>}
              </form>
            </SecaoFicha>

            <SecaoFicha titulo={`Mural de memórias ${mural.length > 0 ? `(${mural.length})` : ''}`} icon={MessageSquare}>
              {mural.length === 0 ? (
                <p className="text-[var(--tema-zinc-500)] text-xs">Nenhuma memória deixada ainda.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {mural.map((m) => (
                    <li key={m.id} className="bg-[var(--tema-zinc-800)]/50 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm">
                          {m.nome} {m.parentesco && <span className="text-[var(--tema-zinc-500)] text-xs">· {m.parentesco}</span>}
                        </p>
                        <p className="text-[var(--tema-zinc-400)] text-xs mt-0.5 break-words">{m.texto}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerMemoria(m.id)}
                        disabled={removendoMuralId === m.id}
                        className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400 whitespace-nowrap shrink-0"
                      >
                        {removendoMuralId === m.id ? '...' : 'Remover'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SecaoFicha>

            <SecaoFicha titulo={`Livro de Assinaturas ${condolencias.length > 0 ? `(${condolencias.length})` : ''}`} icon={BookOpen}>
              {condolencias.length === 0 ? (
                <p className="text-[var(--tema-zinc-500)] text-xs">Ninguém assinou o livro ainda.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {condolencias.map((c) => (
                    <li key={c.id} className="bg-[var(--tema-zinc-800)]/50 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white text-sm">{c.visitor_name}</p>
                        <p className="text-[var(--tema-zinc-400)] text-xs mt-0.5 break-words">{c.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerCondolencia(c.id)}
                        disabled={removendoCondolenciaId === c.id}
                        className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400 whitespace-nowrap shrink-0"
                      >
                        {removendoCondolenciaId === c.id ? '...' : 'Remover'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SecaoFicha>
          </div>
        </div>
      </div>
    </div>
  )
}
