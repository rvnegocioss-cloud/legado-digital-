'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, getParceiroUser } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  biografia: string | null
  frase_preferida: string | null
  slug: string | null
  foto_url: string | null
  video_url: string | null
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
  qr_code_url: string | null
  mensagem_placa: string | null
  familia_email: string | null
  created_at: string
}

function gerarSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const LIMITE_FOTOS = 4 // MVP — revisar conforme plano de storage contratado

async function subirArquivo(memorialId: string, pasta: 'foto' | 'video' | 'galeria', file: File) {
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

const FORM_INICIAL = {
  nome_completo: '',
  data_nascimento: '',
  data_falecimento: '',
  cidade: '',
  frase_preferida: '',
  biografia: '',
}

export default function ParceiroMemoriais() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <ParceiroMemoriaisInner />
    </Suspense>
  )
}

function ParceiroMemoriaisInner() {
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [parceiroId, setParceiroId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Memorial | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [fotoUrl, setFotoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineEventos, setTimelineEventos] = useState<TimelineEvento[]>([])
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [erro, setErro] = useState('')
  const [rascunhoId, setRascunhoId] = useState('')
  const [foiSalvo, setFoiSalvo] = useState(false)
  const [senha, setSenha] = useState('')
  const [temSenha, setTemSenha] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaMsg, setSenhaMsg] = useState('')
  const [temSenhaFamilia, setTemSenhaFamilia] = useState(false)
  const [familiaEmail, setFamiliaEmail] = useState('')
  const [cadastrandoFamiliaEmail, setCadastrandoFamiliaEmail] = useState(false)
  const [familiaEmailMsg, setFamiliaEmailMsg] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gerandoQrCode, setGerandoQrCode] = useState(false)
  const [mensagemPlaca, setMensagemPlaca] = useState('')
  const [salvandoMensagemPlaca, setSalvandoMensagemPlaca] = useState(false)
  const [mensagemPlacaMsg, setMensagemPlacaMsg] = useState('')
  const [mensagemPlacaConfirmada, setMensagemPlacaConfirmada] = useState(false)

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    let meuParceiroId = parceiroIdParam
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }
    setParceiroId(meuParceiroId)

    let query = supabase
      .from('homenagens')
      .select(
        'id, nome_completo, data_nascimento, data_falecimento, cidade, biografia, frase_preferida, slug, foto_url, video_url, galeria_fotos, timeline, qr_code_url, mensagem_placa, familia_email, created_at'
      )
      .order('created_at', { ascending: false })

    if (meuParceiroId) {
      query = query.eq('parceiro_id', meuParceiroId)
    }

    const { data } = await query
    setMemoriais(data || [])
    setLoading(false)
  }

  async function abrirNovo() {
    setForm(FORM_INICIAL)
    setFotoUrl('')
    setSenha('')
    setTemSenha(false)
    setSenhaMsg('')
    setVideoUrl('')
    setGaleria([])
    setTimelineEventos([])
    setQrCodeUrl('')
    setMensagemPlaca('')
    setFamiliaEmail('')
    setErro('')
    setFoiSalvo(false)

    // Cria o rascunho já no banco (id previsível) pra permitir upload de mídia
    // antes do formulário ser salvo — a política de storage exige que o
    // memorial já exista.
    const id = crypto.randomUUID()
    const slug = `rascunho-${id.slice(0, 8)}`
    const { data, error } = await supabase
      .from('homenagens')
      .insert({
        id,
        nome_completo: 'Novo memorial',
        slug,
        memorial_slug: slug,
        parceiro_id: parceiroId,
      })
      .select()
      .single()

    if (error) {
      setErro(error.message)
      return
    }

    setEditando(data)
    setRascunhoId(id)
    setDialogAberto(true)
  }

  async function abrirEdicao(m: Memorial) {
    setEditando(m)
    setFoiSalvo(true)
    setSenha('')
    setSenhaMsg('')
    setForm({
      nome_completo: m.nome_completo,
      data_nascimento: m.data_nascimento || '',
      data_falecimento: m.data_falecimento || '',
      cidade: m.cidade || '',
      frase_preferida: m.frase_preferida || '',
      biografia: m.biografia || '',
    })
    setFotoUrl(m.foto_url || '')
    setVideoUrl(m.video_url || '')
    setGaleria(m.galeria_fotos || [])
    setTimelineEventos(
      (m.timeline || []).map((ev) => ({
        year: ev.year || '',
        title: ev.title || '',
        description: ev.description || '',
      }))
    )
    setQrCodeUrl(m.qr_code_url || '')
    setMensagemPlaca(m.mensagem_placa || '')
    setFamiliaEmail(m.familia_email || '')
    setFamiliaEmailMsg('')
    setErro('')
    setDialogAberto(true)

    const { data: seguranca } = await supabase
      .from('homenagens_seguranca')
      .select('senha_acesso_hash, senha_familia_hash, mensagem_placa_confirmada')
      .eq('homenagem_id', m.id)
      .maybeSingle()
    setTemSenha(!!seguranca?.senha_acesso_hash)
    setTemSenhaFamilia(!!seguranca?.senha_familia_hash)
    setMensagemPlacaConfirmada(!!seguranca?.mensagem_placa_confirmada)
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSalvandoSenha(true)
    setSenhaMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/memorial-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: editando.id, senha, tipo: 'acesso' }),
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
    if (!editando) return
    setCadastrandoFamiliaEmail(true)
    setFamiliaEmailMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/cadastrar-email-familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: editando.id, email: familiaEmail }),
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
    setCadastrandoFamiliaEmail(false)
  }

  async function salvarMensagemPlaca(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSalvandoMensagemPlaca(true)
    setMensagemPlacaMsg('')
    setMensagemPlacaConfirmada(false)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/salvar-mensagem-placa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: editando.id, mensagem: mensagemPlaca }),
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
    setSalvandoMensagemPlaca(false)
  }

  async function gerarQrCode() {
    if (!idParaUpload) return
    setGerandoQrCode(true)
    const url = await gerarQrCodeCliente(idParaUpload)
    if (url) setQrCodeUrl(url)
    setGerandoQrCode(false)
  }

  const idParaUpload = editando?.id || rascunhoId

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoFoto(true)
    setErro('')
    try {
      const url = await subirArquivo(idParaUpload, 'foto', file)
      setFotoUrl(url)
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar foto')
    }
    setEnviandoFoto(false)
  }

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoVideo(true)
    setErro('')
    try {
      const url = await subirArquivo(idParaUpload, 'video', file)
      setVideoUrl(url)
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar vídeo')
    }
    setEnviandoVideo(false)
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
      const urls = await Promise.all(selecionados.map((f) => subirArquivo(idParaUpload, 'galeria', f)))
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
  }

  function removerFotoPrincipal() {
    setFotoUrl('')
  }

  function removerVideo() {
    setVideoUrl('')
  }

  async function fecharDialog(aberto: boolean) {
    const abandonouRascunho = !aberto && editando?.id === rascunhoId && !foiSalvo

    if (abandonouRascunho) {
      // Rascunho criado ao abrir "Novo Memorial" mas fechado sem clicar em Salvar — remove,
      // mesmo que já tenha nome preenchido (evita memorial fantasma com slug "rascunho-xxx")
      await supabase.from('homenagens').delete().eq('id', rascunhoId)
      load()
    }
    setDialogAberto(aberto)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    // Slug só é gerado na primeira vez de verdade — depois disso fica fixo,
    // senão editar o nome troca a URL pública e quebra link/QR já compartilhado.
    const slugAtual = editando?.slug && !editando.slug.startsWith('rascunho-')
      ? editando.slug
      : gerarSlug(form.nome_completo)

    const payload = {
      ...form,
      slug: slugAtual,
      memorial_slug: slugAtual,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      galeria_fotos: galeria,
      timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
    }

    const { error } = await supabase.from('homenagens').update(payload).eq('id', idParaUpload)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    // Limpa do Storage qualquer foto/vídeo/galeria que foi trocado ou removido
    // nessa edição — sem isso o arquivo antigo fica órfão no bucket pra sempre.
    const fotoAntiga = editando?.foto_url
    if (fotoAntiga && fotoAntiga !== fotoUrl) removerArquivoStorage(fotoAntiga)
    const videoAntigo = editando?.video_url
    if (videoAntigo && videoAntigo !== videoUrl) removerArquivoStorage(videoAntigo)
    const galeriaAntiga = editando?.galeria_fotos || []
    galeriaAntiga.filter((u) => !galeria.includes(u)).forEach(removerArquivoStorage)

    gerarQrCodeCliente(idParaUpload).then((url) => { if (url) setQrCodeUrl(url) })

    setFoiSalvo(true)
    setSalvando(false)
    setDialogAberto(false)
    load()
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Meus Memoriais</h1>
        <Dialog open={dialogAberto} onOpenChange={fecharDialog}>
          <DialogTrigger render={<Button onClick={abrirNovo}>+ Novo Memorial</Button>} />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Memorial' : 'Novo Memorial'}
              </DialogTitle>
              {editando?.slug && !editando.slug.startsWith('rascunho-') && (
                <a
                  href={`/homenagem/${editando.slug}`}
                  className="text-xs hover:underline"
                  style={{ color: '#C9A46A' }}
                >
                  Ver página do memorial →
                </a>
              )}
            </DialogHeader>

            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nome completo</label>
                <Input
                  placeholder="Nome completo do falecido"
                  required
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Data de nascimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_nascimento}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Data de falecimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_falecimento}
                    onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Cidade</label>
                <Input
                  placeholder="Cidade onde viveu ou faleceu"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Frase preferida</label>
                <Input
                  placeholder="Uma frase marcante da pessoa"
                  value={form.frase_preferida}
                  onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Biografia</label>
                <textarea
                  placeholder="Conte a história de vida da pessoa"
                  rows={3}
                  value={form.biografia}
                  onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                  className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Foto do homenageado</label>
                {fotoUrl && (
                  <div className="flex items-center gap-3 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotoUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                    <button type="button" onClick={removerFotoPrincipal} className="text-xs text-zinc-500 hover:text-red-400">
                      Remover foto
                    </button>
                  </div>
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
                <label className="block text-xs text-zinc-500 mb-1">Vídeo</label>
                {videoUrl && (
                  <div className="mb-2">
                    <video src={videoUrl} controls className="w-full rounded-md max-h-40 bg-black" />
                    <button type="button" onClick={removerVideo} className="text-xs text-zinc-500 hover:text-red-400 mt-1">
                      Remover vídeo
                    </button>
                  </div>
                )}
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
                  Galeria de fotos ({galeria.length}/{LIMITE_FOTOS})
                </label>
                {galeria.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {galeria.map((url) => (
                      <div key={url} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-14 object-cover rounded" />
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

              <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <DialogFooter className="bg-transparent border-zinc-800 mt-4">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>

            {editando && (
              <form onSubmit={salvarSenha} className="mt-2 pt-4 border-t border-zinc-800">
                <label className="block text-xs text-zinc-500 mb-1">
                  {temSenha ? 'Nova senha (ou deixe em branco pra tornar público)' : 'Senha de acesso (deixe em branco pra público)'}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Deixe em branco pra público"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button type="submit" disabled={salvandoSenha}>
                    {salvandoSenha ? 'Salvando...' : 'Salvar senha'}
                  </Button>
                </div>
                {senhaMsg && <p className="text-xs text-zinc-400 mt-2">{senhaMsg}</p>}
              </form>
            )}

            {editando && (
              <form onSubmit={cadastrarEmailFamilia} className="mt-2 pt-4 border-t border-zinc-800 space-y-2">
                <label className="block text-xs text-zinc-500 mb-1">E-mail da família</label>
                <p className="text-zinc-500 text-xs">
                  Gera senha simples sozinho e manda por e-mail — família usa em /familia/login
                  pra enviar fotos, vídeo e história. Também recebe o pedido de confirmação da
                  mensagem da placa.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@familia.com"
                    required
                    value={familiaEmail}
                    onChange={(e) => setFamiliaEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button type="submit" disabled={cadastrandoFamiliaEmail}>
                    {cadastrandoFamiliaEmail ? 'Cadastrando...' : temSenhaFamilia ? 'Gerar nova senha' : 'Cadastrar'}
                  </Button>
                </div>
                {familiaEmailMsg && <p className="text-xs text-zinc-400 mt-2">{familiaEmailMsg}</p>}
              </form>
            )}

            {editando && (
              <div className="mt-2 pt-4 border-t border-zinc-800">
                <label className="block text-xs text-zinc-500 mb-2">QR Code do memorial</label>
                <div className="flex items-center gap-3">
                  {qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCodeUrl} alt="" className="w-16 h-16 rounded bg-white p-1" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-zinc-800" />
                  )}
                  <div className="flex flex-col gap-1">
                    {qrCodeUrl && (
                      <a
                        href={qrCodeUrl}
                        download={`qrcode-${editando.slug}.png`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Baixar QR Code
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={gerarQrCode}
                      disabled={gerandoQrCode}
                      className="text-zinc-400 hover:text-white text-xs text-left"
                    >
                      {gerandoQrCode ? 'Gerando...' : qrCodeUrl ? 'Atualizar QR Code' : 'Gerar QR Code'}
                    </button>
                  </div>
                </div>

                <form onSubmit={salvarMensagemPlaca} className="mt-3">
                  <label className="block text-xs text-zinc-500 mb-1">Mensagem da placa</label>
                  <p className="text-zinc-500 text-xs mb-2">
                    Texto que a família quer gravado na placa junto do QR — vai anexado no e-mail
                    pro fornecedor, pra confeccionar tudo junto.
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Ex: Em memória eterna de..."
                    value={mensagemPlaca}
                    onChange={(e) => setMensagemPlaca(e.target.value)}
                    className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 mb-2"
                  />
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={salvandoMensagemPlaca}>
                      {salvandoMensagemPlaca ? 'Salvando...' : 'Salvar mensagem'}
                    </Button>
                    {mensagemPlaca.trim() && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          mensagemPlacaConfirmada ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
                        }`}
                      >
                        {mensagemPlacaConfirmada ? 'Confirmado pela família' : 'Aguardando confirmação'}
                      </span>
                    )}
                  </div>
                  {mensagemPlacaMsg && <p className="text-xs text-zinc-400 mt-2">{mensagemPlacaMsg}</p>}
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {memoriais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum memorial cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Cidade</th>
                <th className="text-left py-3 px-4">Criado em</th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{m.nome_completo}</td>
                  <td className="py-3 px-4 text-zinc-300">{m.cidade || '-'}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    {m.slug && (
                      <a
                        href={`/homenagem/${m.slug}`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Ver página
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {m.qr_code_url && (
                      <a
                        href={m.qr_code_url}
                        download={`qrcode-${m.slug}.png`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Baixar QR Code
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => abrirEdicao(m)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
