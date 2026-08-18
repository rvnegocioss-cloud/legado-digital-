'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'
import SecaoRetratil from '@/components/admin/SecaoRetratil'
import { PrivacidadeMemorial } from '@/components/admin/PrivacidadeMemorial'
import { VinculosEditor } from '@/components/admin/VinculosEditor'
import { PALETAS_MEMORIAL } from '@/lib/temasMemorial'
import { useTravaEdicao, rotuloPapel } from '@/lib/useTravaEdicao'

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  frase_preferida: string | null
  biografia: string | null
  slug: string | null
  parceiro_id: string | null
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
  lapide_id: string | null
  vinculos: string[] | null
  preenchido_por: 'funeraria' | 'familia' | null
  tema: string
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

interface Parceiro {
  nome_fantasia: string | null
  razao_social: string
}

export default function DetalheMemorial() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  // Presenca ao vivo -- staff ve quando a familia esta editando o mesmo
  // memorial naquele instante, e vice-versa.
  const { outros: outrosEditando, temOutroEditando } = useTravaEdicao(memorial?.slug, undefined, 'staff')
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [form, setForm] = useState({
    nome_completo: '',
    data_nascimento: '',
    data_falecimento: '',
    cidade: '',
    frase_preferida: '',
    biografia: '',
    lapide_id: '',
  })
  const [cemiterios, setCemiterios] = useState<Cemiterio[]>([])
  const [lapides, setLapides] = useState<Lapide[]>([])
  const [cemiterioSelecionadoId, setCemiterioSelecionadoId] = useState('')
  const [confirmoVinculoLapide, setConfirmoVinculoLapide] = useState(false)
  const [vinculos, setVinculos] = useState<string[]>([])
  const [fotoUrl, setFotoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videosGaleria, setVideosGaleria] = useState<string[]>([])
  const [tema, setTema] = useState('navy')
  const [enviandoVideosGaleria, setEnviandoVideosGaleria] = useState(false)
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineEventos, setTimelineEventos] = useState<TimelineEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [usoStorageMB, setUsoStorageMB] = useState(0)
  const [senha, setSenha] = useState('')
  const [temSenha, setTemSenha] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaMsg, setSenhaMsg] = useState('')
  const [temSenhaFamilia, setTemSenhaFamilia] = useState(false)
  const [familiaEmail, setFamiliaEmail] = useState('')
  const [cadastrandoFamiliaEmail, setCadastrandoFamiliaEmail] = useState(false)
  const [familiaEmailMsg, setFamiliaEmailMsg] = useState('')
  const [preenchidoPor, setPreenchidoPor] = useState<'funeraria' | 'familia'>('familia')
  const [salvandoPreenchidoPor, setSalvandoPreenchidoPor] = useState(false)
  const [mural, setMural] = useState<{ id: string; nome: string; parentesco: string | null; texto: string; created_at: string }[]>([])
  const [removendoMuralId, setRemovendoMuralId] = useState<string | null>(null)
  const [condolencias, setCondolencias] = useState<{ id: string; visitor_name: string; message: string; created_at: string }[]>([])
  const [removendoCondolenciaId, setRemovendoCondolenciaId] = useState<string | null>(null)
  const [familiaCpf, setFamiliaCpf] = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [familiaTelefone, setFamiliaTelefone] = useState('')
  const [consultandoCpf, setConsultandoCpf] = useState(false)
  const [cpfMsg, setCpfMsg] = useState('')
  const [cpfModoTeste, setCpfModoTeste] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gerandoQrCode, setGerandoQrCode] = useState(false)
  const [qrCodeMsg, setQrCodeMsg] = useState('')
  const [mensagemPlaca, setMensagemPlaca] = useState('')
  const [salvandoMensagemPlaca, setSalvandoMensagemPlaca] = useState(false)
  const [mensagemPlacaMsg, setMensagemPlacaMsg] = useState('')
  const [mensagemPlacaConfirmada, setMensagemPlacaConfirmada] = useState(false)
  const [envioFornecedorStatus, setEnvioFornecedorStatus] = useState<'enviado' | 'erro' | null>(null)
  const [acessandoFamilia, setAcessandoFamilia] = useState(false)

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
    const { data: m } = await supabase.from('homenagens').select('*').eq('id', id).single()
    setMemorial(m)

    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(`/api/memorial-storage-usage?memorialId=${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then((r) => r.json())
        .then((json) => setUsoStorageMB(Math.round((json.usageBytes || 0) / 1024 / 1024)))
        .catch(() => {})
    )

    const { data: muralData } = await supabase
      .from('mural_memorias')
      .select('id, nome, parentesco, texto, created_at')
      .eq('homenagem_id', id)
      .order('created_at', { ascending: false })
    setMural(muralData || [])

    const { data: condolenciasData } = await supabase
      .from('condolencias')
      .select('id, visitor_name, message, created_at')
      .eq('homenagem_id', id)
      .order('created_at', { ascending: false })
    setCondolencias(condolenciasData || [])

    const { data: cemiteriosData } = await supabase.from('cemiterios').select('id, nome').order('nome')
    setCemiterios(cemiteriosData || [])

    // Nunca carregar lapides de todos os cemiterios de uma vez (estoura o teto
    // de 1000 linhas do PostgREST silenciosamente em cemiterio grande) --
    // busca so a lapide ja vinculada (se tiver) pra saber o cemiterio dela,
    // o resto do dropdown carrega filtrado quando o staff escolhe o cemiterio.
    let lapidesData: Lapide[] = []
    if (m?.lapide_id) {
      const { data: lapideAtual } = await supabase
        .from('lapides')
        .select('id, identificacao, codigo, cemiterio_id, fila_id, quadras(numero), filas(numero), homenagens(id)')
        .eq('id', m.lapide_id)
        .single()
      if (lapideAtual) lapidesData = [lapideAtual as unknown as Lapide]
    }
    setLapides(lapidesData)

    if (m) {
      setForm({
        nome_completo: m.nome_completo || '',
        data_nascimento: m.data_nascimento || '',
        data_falecimento: m.data_falecimento || '',
        cidade: m.cidade || '',
        frase_preferida: m.frase_preferida || '',
        biografia: m.biografia || '',
        lapide_id: m.lapide_id || '',
      })
      if (m.lapide_id) {
        const lapideAtual = (lapidesData || []).find((l) => l.id === m.lapide_id)
        if (lapideAtual) setCemiterioSelecionadoId(lapideAtual.cemiterio_id)
      }
      setVinculos(m.vinculos || [])
      setFotoUrl(m.foto_url || '')
      setVideoUrl(m.video_url || '')
      setVideosGaleria(m.videos_galeria || [])
      setGaleria(m.galeria_fotos || [])
      setTema(m.tema || 'navy')
      setMensagemPlaca(m.mensagem_placa || '')
      setFamiliaEmail(m.familia_email || '')
      setFamiliaNome(m.familia_nome_responsavel || '')
      setFamiliaTelefone(m.familia_telefone || '')
      setPreenchidoPor(m.preenchido_por || 'familia')
      setTimelineEventos(
        (m.timeline || []).map((ev: { year?: string; title?: string; description?: string }) => ({
          year: ev.year || '',
          title: ev.title || '',
          description: ev.description || '',
        }))
      )

      if (m.parceiro_id) {
        const { data: p } = await supabase
          .from('parceiros_b2b')
          .select('nome_fantasia, razao_social')
          .eq('id', m.parceiro_id)
          .single()
        setParceiro(p)
      }

      const { data: seguranca } = await supabase
        .from('homenagens_seguranca')
        .select('senha_acesso_hash, senha_familia_hash, mensagem_placa_confirmada')
        .eq('homenagem_id', m.id)
        .maybeSingle()
      setTemSenha(!!seguranca?.senha_acesso_hash)
      setTemSenhaFamilia(!!seguranca?.senha_familia_hash)
      setMensagemPlacaConfirmada(!!seguranca?.mensagem_placa_confirmada)

      const { data: envioFornecedorData } = await supabase
        .from('emails_enviados')
        .select('status')
        .eq('homenagem_id', m.id)
        .eq('tipo', 'envio_fornecedor')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setEnvioFornecedorStatus((envioFornecedorData?.status as 'enviado' | 'erro' | undefined) ?? null)

      const nomeDoBanco = (m.nome_completo || '').trim()
      const nomeValido = nomeDoBanco && nomeDoBanco !== 'Novo memorial'
      if (m.qr_code_url) {
        setQrCodeUrl(m.qr_code_url)
      } else if (m.slug && nomeValido && (m.data_falecimento || '').trim()) {
        // Auto-gera só se faltava (self-heal de uma falha anterior) — nunca
        // na primeira vez que a Central abre um rascunho do Parceiro ainda
        // sem nome/data reais, senão dispara pedido em branco pro fornecedor
        // só de abrir a ficha, sem clicar em nada.
        gerarQrCodeCliente(m.id).then(({ qrCodeUrl, updatedAt }) => {
          if (qrCodeUrl) setQrCodeUrl(qrCodeUrl)
          if (updatedAt) setMemorial((atual) => (atual ? { ...atual, updated_at: updatedAt } : atual))
        })
      }
    }
    setLoading(false)
  }

  async function gerarQrCode() {
    if (!memorial) return
    const nome = form.nome_completo.trim()
    if (!nome || nome === 'Novo memorial') {
      setQrCodeMsg('Preenche o nome antes — esse QR dispara pedido pro fornecedor da placa física, precisa saber de quem é.')
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
      setSenhaMsg(json.temSenha ? 'Senha definida — memorial agora exige senha na busca.' : 'Senha removida — memorial voltou a ser público.')
    }
    setSalvandoSenha(false)
  }

  async function acessarPortalFamilia() {
    if (!memorial) return
    setAcessandoFamilia(true)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/acessar-familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: memorial.id }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json.error || 'Erro ao acessar o Portal da Família')
      setAcessandoFamilia(false)
      return
    }
    router.push(`/familia/${json.slug}`)
  }

  async function consultarCpf() {
    setConsultandoCpf(true)
    setCpfMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/consultar-cpf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ cpf: familiaCpf, memorialId: memorial?.id }),
    })
    const json = await res.json()

    if (!res.ok) {
      setCpfMsg(json.error || 'Erro ao consultar CPF')
    } else {
      setFamiliaNome(json.nome || '')
      setCpfModoTeste(!!json.modoTeste)
      setCpfMsg(json.modoTeste ? 'Preenchido — dado fictício (modo teste, sem token de produção).' : 'Preenchido.')
    }
    setConsultandoCpf(false)
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

  async function removerMemoria(id: string) {
    setRemovendoMuralId(id)
    await supabase.from('mural_memorias').delete().eq('id', id)
    setMural((atual) => atual.filter((m) => m.id !== id))
    setRemovendoMuralId(null)
  }

  async function removerCondolencia(id: string) {
    setRemovendoCondolenciaId(id)
    await supabase.from('condolencias').delete().eq('id', id)
    setCondolencias((atual) => atual.filter((c) => c.id !== id))
    setRemovendoCondolenciaId(null)
  }

  async function cadastrarEmailFamilia(e: React.FormEvent) {
    e.preventDefault()
    if (!memorial) return
    const nomeFamilia = form.nome_completo.trim()
    if (!nomeFamilia || nomeFamilia === 'Novo memorial') {
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
        nome: familiaNome,
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
      setFamiliaEmailMsg(`Cadastrado, mas o e-mail não saiu (Resend não configurado). Senha gerada: ${json.senha} — repasse manualmente.`)
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
      setMensagemPlacaMsg('Salvo, mas o e-mail de confirmação não saiu (Resend não configurado).')
    } else {
      setMensagemPlacaMsg('Salvo — sem mensagem, o QR Code segue direto pro fornecedor.')
    }
    if (json.updatedAt) {
      setMemorial((atual) => (atual ? { ...atual, updated_at: json.updatedAt } : atual))
    }
    setSalvandoMensagemPlaca(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSalvo(false)

    // Checa se alguém (família, no outro portal) mexeu nesse memorial desde
    // que essa tela carregou — sem isso, salvar aqui sobrescreve silenciosamente
    // qualquer alteração feita em paralelo, sem avisar nenhum dos dois lados.
    if (memorial?.updated_at) {
      const { data: atual } = await supabase
        .from('homenagens')
        .select('updated_at')
        .eq('id', params.id)
        .single()
      if (atual && atual.updated_at !== memorial.updated_at) {
        setErro('Esse memorial foi alterado por outra pessoa (família ou outro operador) desde que essa tela abriu. Recarregue a página antes de salvar, pra não sobrescrever a mudança dela.')
        setSalvando(false)
        return
      }
    }

    if (form.lapide_id && form.lapide_id !== memorial?.lapide_id) {
      const lapideEscolhida = lapides.find((l) => l.id === form.lapide_id)
      const arriscado = lapideEscolhida && (!lapideEscolhida.fila_id || lapideEscolhida.homenagens.length > 0)
      if (arriscado && !confirmoVinculoLapide) {
        setErro('Confirma o túmulo antes de salvar (caixa vermelha acima do formulário) -- esse túmulo está fora de fileira ou já tem memorial vinculado.')
        setSalvando(false)
        return
      }
    }

    const payload = {
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
    const { data: atualizado, error } = await supabase
      .from('homenagens')
      .update(payload)
      .eq('id', params.id)
      .select('updated_at')
      .single()

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    // Limpa do Storage qualquer foto/vídeo/galeria que foi trocado ou removido
    // nessa edição — sem isso o arquivo antigo fica órfão no bucket pra sempre.
    const fotoAntiga = memorial?.foto_url
    if (fotoAntiga && fotoAntiga !== fotoUrl) removerArquivoStorage(fotoAntiga)
    const videoAntigo = memorial?.video_url
    if (videoAntigo && videoAntigo !== videoUrl) removerArquivoStorage(videoAntigo)
    const galeriaAntiga = memorial?.galeria_fotos || []
    galeriaAntiga.filter((u) => !galeria.includes(u)).forEach(removerArquivoStorage)
    const videosGaleriaAntiga = memorial?.videos_galeria || []
    videosGaleriaAntiga.filter((u) => !videosGaleria.includes(u)).forEach(removerArquivoStorage)

    setSalvando(false)
    setSalvo(true)
    if (memorial) {
      setMemorial({
        ...memorial,
        ...form,
        foto_url: fotoUrl || null,
        video_url: videoUrl || null,
        videos_galeria: videosGaleria,
        galeria_fotos: galeria,
        tema,
        updated_at: atualizado?.updated_at || memorial.updated_at,
      })
    }
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

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
    removerMidiaDoServidor('galeria', url)
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  if (!memorial) return <p className="text-[var(--tema-zinc-400)]">Memorial não encontrado.</p>

  return (
    <div>
      <Link href="/admin/memoriais" className="text-sm text-[var(--tema-zinc-400)] hover:text-white">
        ← Voltar pra Memoriais
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{memorial.nome_completo}</h1>
          <p className="text-[var(--tema-zinc-400)] text-sm mt-1">
            {parceiro
              ? `Cadastrado por ${parceiro.nome_fantasia || parceiro.razao_social}`
              : 'Cadastrado diretamente pela Legado Digital'}
          </p>
        </div>
        {memorial.slug && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={acessarPortalFamilia}
              disabled={acessandoFamilia}
              className="px-3 py-1.5 rounded-lg bg-[var(--tema-zinc-800)] hover:bg-[var(--tema-zinc-700)] border border-[var(--tema-zinc-700)] text-white text-sm font-medium whitespace-nowrap disabled:opacity-60"
            >
              {acessandoFamilia ? 'Entrando...' : 'Acessar Portal da Família'}
            </button>
            <a
              href={`/homenagem/${memorial.slug}`}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-branco-fixo text-sm font-medium whitespace-nowrap"
            >
              Acessar página do memorial
            </a>
          </div>
        )}
      </div>

      {temOutroEditando && (
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-200 font-medium">
            {rotuloPapel(outrosEditando[0].papel)} está editando este memorial agora.
          </p>
          <p className="text-xs text-red-300/80 mt-1">
            Evite salvar por cima — combine antes, ou espere ela terminar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6">
        <h2 className="text-sm font-medium text-[var(--tema-zinc-400)] mb-4">Dados do memorial</h2>
        <form onSubmit={salvar} className="space-y-3">
          <div className="flex gap-6 items-start">
          <div className="max-w-sm flex-1">
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Nome completo</label>
            <Input
              placeholder="Nome completo do falecido"
              required
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
          </div>

          <div className="flex-1 max-w-sm">
          <SecaoRetratil titulo="Mídia (foto, vídeo, galeria)">
          <div className="space-y-4">
            <div className="pb-3 border-b border-[var(--tema-zinc-800)]">
              <p className="text-xs text-[var(--tema-zinc-500)] mb-2">Armazenamento do memorial</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[var(--tema-zinc-800)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-colors ${
                      usoStorageMB < 250 ? 'bg-green-500' : usoStorageMB < 400 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (usoStorageMB / 500) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--tema-zinc-400)] whitespace-nowrap">{usoStorageMB}MB / 500MB</span>
              </div>
            </div>

          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Foto do homenageado (máx 10MB)</label>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-2">JPEG, PNG ou GIF</p>
            {fotoUrl && (
              <div className="flex items-center gap-3 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl} alt="" className="w-24 h-24 rounded-full object-cover" />
                <button type="button" onClick={removerFotoPrincipal} className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400">
                  Remover foto
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              disabled={enviandoFoto}
              className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)]"
            />
            {enviandoFoto && <p className="text-xs text-[var(--tema-zinc-500)] mt-1">Enviando foto...</p>}
          </div>

          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Vídeo (máx 50MB)</label>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-2">MP4, WebM ou QuickTime</p>
            {videoUrl && (
              <div className="mb-2">
                <video src={videoUrl} controls className="w-full rounded-md max-h-48 bg-black" />
                <button type="button" onClick={removerVideo} className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400 mt-1">
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
            {enviandoVideo && <p className="text-xs text-[var(--tema-zinc-500)] mt-1">Enviando vídeo...</p>}
          </div>

          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">
              Galeria de vídeos ({videosGaleria.length}/{LIMITE_VIDEOS})
            </label>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-2">Até {LIMITE_VIDEOS} vídeos além do vídeo principal, máx 100MB cada</p>
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
              className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)] disabled:opacity-50"
            />
            {enviandoVideosGaleria && <p className="text-xs text-[var(--tema-zinc-500)] mt-1">Enviando vídeos...</p>}
          </div>

          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">
              Galeria de fotos ({galeria.length}/{LIMITE_FOTOS})
            </label>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-2">Até {LIMITE_FOTOS} fotos, máx 10MB cada</p>
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
              className="block w-full text-sm text-[var(--tema-zinc-400)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--tema-zinc-700)] file:text-white file:text-xs hover:file:bg-[var(--tema-zinc-600)] disabled:opacity-50"
            />
            {enviandoGaleria && <p className="text-xs text-[var(--tema-zinc-500)] mt-1">Enviando fotos...</p>}
          </div>

          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Tema da página pública</label>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-2">Cor de fundo e detalhes dourados da página do memorial</p>
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
          </div>
          </div>
          </SecaoRetratil>
          </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Data de nascimento</label>
              <Input
                placeholder="DD/MM/AAAA"
                value={form.data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Data de falecimento</label>
              <Input
                placeholder="DD/MM/AAAA"
                value={form.data_falecimento}
                onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Cidade</label>
            <Input
              placeholder="Cidade onde viveu ou faleceu"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Cemitério</label>
              <select
                value={cemiterioSelecionadoId}
                onChange={(e) => {
                  setCemiterioSelecionadoId(e.target.value)
                  setForm({ ...form, lapide_id: '' })
                }}
                className="flex h-10 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white"
              >
                <option value="">Sem cemitério vinculado</option>
                {cemiterios.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Lápide</label>
              <select
                value={form.lapide_id}
                onChange={(e) => {
                  setForm({ ...form, lapide_id: e.target.value })
                  setConfirmoVinculoLapide(false)
                }}
                disabled={!cemiterioSelecionadoId}
                className="flex h-10 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white disabled:opacity-50"
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
            </div>
          </div>

          {(() => {
            if (!form.lapide_id || form.lapide_id === memorial?.lapide_id) return null
            const l = lapides.find((x) => x.id === form.lapide_id)
            if (!l) return null
            const arriscado = !l.fila_id || l.homenagens.length > 0
            if (!arriscado) return null
            return (
              <div className="rounded-lg bg-red-950/30 border border-red-900/40 px-3 py-2 space-y-2">
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
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Vínculo/papel (aparece perto do nome na página)</label>
            <VinculosEditor value={vinculos} onChange={setVinculos} />
          </div>
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Frase preferida</label>
            <Input
              placeholder="Uma frase marcante da pessoa"
              value={form.frase_preferida}
              onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Biografia</label>
            <textarea
              placeholder="Conte a história de vida da pessoa"
              rows={4}
              value={form.biografia}
              onChange={(e) => setForm({ ...form, biografia: e.target.value })}
              className="flex w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)]"
            />
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-[var(--tema-zinc-800)] space-y-4">
          <SecaoRetratil titulo="Privacidade — senha de acesso">
            <p className="text-[var(--tema-zinc-500)] text-xs mb-4">
              {temSenha
                ? 'Este memorial exige senha na busca pública E pra abrir a página direto (link ou QR Code). Deixe o campo em branco e salve pra tornar público de novo.'
                : 'Este memorial está público — qualquer um encontra pelo nome na busca ou abre direto pelo link/QR Code. Defina uma senha pra exigir acesso restrito em ambos.'}
            </p>
            <form onSubmit={salvarSenha} className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">
                  {temSenha ? 'Nova senha (ou deixe em branco pra remover)' : 'Senha de acesso'}
                </label>
                <Input
                  type="text"
                  placeholder="Deixe em branco pra público"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <Button type="submit" disabled={salvandoSenha} className="self-end">
                {salvandoSenha ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
            {senhaMsg && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">{senhaMsg}</p>}
          </SecaoRetratil>

          <SecaoRetratil titulo="Privacidade — modos de acesso">
            {memorial && <PrivacidadeMemorial memorialId={memorial.id} />}
          </SecaoRetratil>

          <SecaoRetratil titulo="Cadastro da família">
            <p className="text-[var(--tema-zinc-500)] text-xs mb-4">
              CPF do responsável (opcional, preenche o nome automaticamente) e e-mail de contato —
              o sistema gera uma senha simples sozinho e manda por e-mail. Ela usa essa senha pra
              entrar em /familia/login e enviar fotos, vídeo e a história. Esse e-mail também recebe
              o pedido de confirmação da mensagem da placa.
            </p>

            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">CPF do responsável</label>
                <Input
                  placeholder="000.000.000-00"
                  value={familiaCpf}
                  onChange={(e) => setFamiliaCpf(e.target.value)}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <Button type="button" onClick={consultarCpf} disabled={consultandoCpf} className="self-end whitespace-nowrap">
                {consultandoCpf ? 'Consultando...' : 'Consultar CPF'}
              </Button>
            </div>
            {cpfMsg && (
              <p className={`text-xs mb-3 ${cpfModoTeste ? 'text-yellow-400' : 'text-[var(--tema-zinc-400)]'}`}>{cpfMsg}</p>
            )}
            <div className="mb-4">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Nome do responsável</label>
              <Input
                placeholder="Preenchido pela consulta ou digite manualmente"
                value={familiaNome}
                onChange={(e) => setFamiliaNome(e.target.value)}
                className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-2">Quem preenche o conteúdo?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)]">
                  <input
                    type="radio"
                    checked={preenchidoPor === 'familia'}
                    onChange={() => salvarPreenchidoPor('familia')}
                    disabled={salvandoPreenchidoPor}
                  />
                  A família preenche
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)]">
                  <input
                    type="radio"
                    checked={preenchidoPor === 'funeraria'}
                    onChange={() => salvarPreenchidoPor('funeraria')}
                    disabled={salvandoPreenchidoPor}
                  />
                  A funerária/Central preenche
                </label>
              </div>
            </div>

            <form onSubmit={cadastrarEmailFamilia} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">E-mail da família</label>
                  <Input
                    type="email"
                    placeholder="email@familia.com"
                    required
                    value={familiaEmail}
                    onChange={(e) => setFamiliaEmail(e.target.value)}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
                <div className="w-44">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Telefone</label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={familiaTelefone}
                    onChange={(e) => setFamiliaTelefone(e.target.value)}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
              </div>
              <Button type="submit" disabled={cadastrandoFamiliaEmail} className="whitespace-nowrap">
                {cadastrandoFamiliaEmail ? 'Cadastrando...' : temSenhaFamilia ? 'Gerar nova senha' : 'Cadastrar'}
              </Button>
            </form>
            {familiaEmailMsg && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">{familiaEmailMsg}</p>}
          </SecaoRetratil>

          <SecaoRetratil titulo={`Moderação do mural de memórias ${mural.length > 0 ? `(${mural.length})` : ''}`}>
            {mural.length === 0 ? (
              <p className="text-[var(--tema-zinc-500)] text-xs">Nenhuma memória deixada ainda.</p>
            ) : (
              <ul className="space-y-2">
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
          </SecaoRetratil>

          <SecaoRetratil titulo={`Moderação do Livro de Assinaturas ${condolencias.length > 0 ? `(${condolencias.length})` : ''}`}>
            {condolencias.length === 0 ? (
              <p className="text-[var(--tema-zinc-500)] text-xs">Ninguém assinou o livro ainda.</p>
            ) : (
              <ul className="space-y-2">
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
          </SecaoRetratil>
        </div>

        <form onSubmit={salvar} className="space-y-3 mt-4 pt-4 border-t border-[var(--tema-zinc-800)]">
          <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />

          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          {salvo && <p className="text-green-400 text-sm">Salvo.</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6 lg:self-start">
        <h2 className="text-sm font-medium text-[var(--tema-zinc-400)] mb-4">QR Code do memorial</h2>
        <div className="flex items-center gap-4">
          {qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeUrl} alt="" className="w-28 h-28 rounded bg-white p-1.5" />
          ) : (
            <div className="w-28 h-28 rounded bg-[var(--tema-zinc-800)]" />
          )}
          <div className="flex flex-col gap-2">
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`qrcode-${memorial.slug}.png`}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-branco-fixo text-sm font-medium text-center"
              >
                Baixar QR Code
              </a>
            )}
            <button
              type="button"
              onClick={gerarQrCode}
              disabled={gerandoQrCode}
              className="text-[var(--tema-zinc-400)] hover:text-white text-xs text-left"
            >
              {gerandoQrCode ? 'Gerando...' : qrCodeUrl ? 'Atualizar QR Code' : 'Gerar QR Code'}
            </button>
          </div>
        </div>
        {qrCodeMsg && <p className="text-xs text-yellow-400 mt-2">{qrCodeMsg}</p>}

        <form onSubmit={salvarMensagemPlaca} className="mt-5 pt-4 border-t border-[var(--tema-zinc-800)]">
          <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Mensagem da placa</label>
          <p className="text-[var(--tema-zinc-500)] text-xs mb-2">
            Texto que a família quer gravado na placa junto do QR Code — vai anexado no e-mail
            pro fornecedor de placas, pra confeccionar tudo junto.
          </p>
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
                className={`text-xs px-2 py-1 rounded ${
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
          {mensagemPlacaMsg && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">{mensagemPlacaMsg}</p>}
        </form>
      </div>
      </div>

    </div>
  )
}
