'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'
import SecaoRetratil from '@/components/admin/SecaoRetratil'

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
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
  qr_code_url: string | null
  mensagem_placa: string | null
  familia_email: string | null
  preenchido_por: 'funeraria' | 'familia' | null
  created_at: string
  updated_at: string
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

export default function FichaMemorialParceiro() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
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
  })
  const [fotoUrl, setFotoUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
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
  const [cadastrandoFamiliaEmail, setCadastrandoFamiliaEmail] = useState(false)
  const [familiaEmailMsg, setFamiliaEmailMsg] = useState('')
  const [preenchidoPor, setPreenchidoPor] = useState<'funeraria' | 'familia'>('familia')
  const [salvandoPreenchidoPor, setSalvandoPreenchidoPor] = useState(false)
  const [mural, setMural] = useState<{ id: string; nome: string; parentesco: string | null; texto: string; created_at: string }[]>([])
  const [removendoMuralId, setRemovendoMuralId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gerandoQrCode, setGerandoQrCode] = useState(false)
  const [mensagemPlaca, setMensagemPlaca] = useState('')
  const [salvandoMensagemPlaca, setSalvandoMensagemPlaca] = useState(false)
  const [mensagemPlacaMsg, setMensagemPlacaMsg] = useState('')
  const [mensagemPlacaConfirmada, setMensagemPlacaConfirmada] = useState(false)

  useEffect(() => {
    if (params.id) load(params.id)
  }, [params.id])

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
        'id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, slug, foto_url, video_url, galeria_fotos, timeline, qr_code_url, mensagem_placa, familia_email, preenchido_por, parceiro_id, created_at, updated_at'
      )
      .eq('id', id)
      .maybeSingle()

    if (!m || !meuParceiroId || m.parceiro_id !== meuParceiroId) {
      setMemorial(null)
      setLoading(false)
      return
    }

    setMemorial(m)
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
      (m.timeline || []).map((ev: { year?: string; title?: string; description?: string }) => ({
        year: ev.year || '',
        title: ev.title || '',
        description: ev.description || '',
      }))
    )
    setQrCodeUrl(m.qr_code_url || '')
    setMensagemPlaca(m.mensagem_placa || '')
    setFamiliaEmail(m.familia_email || '')
    setPreenchidoPor(m.preenchido_por || 'familia')

    const { data: seguranca } = await supabase
      .from('homenagens_seguranca')
      .select('senha_acesso_hash, senha_familia_hash, mensagem_placa_confirmada')
      .eq('homenagem_id', m.id)
      .maybeSingle()
    setTemSenha(!!seguranca?.senha_acesso_hash)
    setTemSenhaFamilia(!!seguranca?.senha_familia_hash)
    setMensagemPlacaConfirmada(!!seguranca?.mensagem_placa_confirmada)

    fetch(`/api/memorial-storage-usage?memorialId=${m.id}`)
      .then((r) => r.json())
      .then((json) => setUsoStorageMB(Math.round((json.usageBytes || 0) / 1024 / 1024)))
      .catch(() => {})

    const { data: muralData } = await supabase
      .from('mural_memorias')
      .select('id, nome, parentesco, texto, created_at')
      .eq('homenagem_id', m.id)
      .order('created_at', { ascending: false })
    setMural(muralData || [])

    setLoading(false)
  }

  async function removerMemoria(id: string) {
    setRemovendoMuralId(id)
    await supabase.from('mural_memorias').delete().eq('id', id)
    setMural((atual) => atual.filter((mem) => mem.id !== id))
    setRemovendoMuralId(null)
  }

  async function salvarPreenchidoPor(valor: 'funeraria' | 'familia') {
    if (!memorial) return
    setPreenchidoPor(valor)
    setSalvandoPreenchidoPor(true)
    await supabase.from('homenagens').update({ preenchido_por: valor }).eq('id', memorial.id)
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
    setCadastrandoFamiliaEmail(true)
    setFamiliaEmailMsg('')

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/cadastrar-email-familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: memorial.id, email: familiaEmail }),
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
    setSalvandoMensagemPlaca(false)
  }

  async function gerarQrCode() {
    if (!memorial) return
    setGerandoQrCode(true)
    const url = await gerarQrCodeCliente(memorial.id)
    if (url) setQrCodeUrl(url)
    setGerandoQrCode(false)
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

  function removerFotoPrincipal() {
    setFotoUrl('')
  }

  function removerVideo() {
    setVideoUrl('')
  }

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
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

    const payload = {
      ...form,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      galeria_fotos: galeria,
      timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
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

    gerarQrCodeCliente(memorial.id).then((url) => { if (url) setQrCodeUrl(url) })

    setSalvando(false)
    setSalvo(true)
    setMemorial({ ...memorial, ...form, foto_url: fotoUrl || null, video_url: videoUrl || null, galeria_fotos: galeria, updated_at: atualizado?.updated_at || memorial.updated_at })
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>
  if (!memorial) return <p className="text-zinc-400">Memorial não encontrado.</p>

  const conteudoFechadoPorPadrao = preenchidoPor === 'familia'

  return (
    <div>
      <Link href={`/parceiro/memoriais${suffix}`} className="text-sm text-zinc-400 hover:text-white">
        ← Voltar pra Meus Memoriais
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <h1 className="text-2xl font-bold text-white">{memorial.nome_completo}</h1>
        {memorial.slug && (
          <a
            href={`/homenagem/${memorial.slug}`}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap shrink-0"
          >
            Ver página do memorial
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-4">Dados do memorial</h2>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nome completo</label>
                <Input
                  required
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Data de nascimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_nascimento}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Data de falecimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_falecimento}
                    onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Cidade</label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Frase preferida</label>
                  <Input
                    value={form.frase_preferida}
                    onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Biografia</label>
                <textarea
                  rows={6}
                  value={form.biografia}
                  onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                  className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>

              {conteudoFechadoPorPadrao && (
                <p className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 rounded-lg px-3 py-2">
                  A família optou por preencher — evite sobrescrever o que ela já colocou. Mudar isso no card &quot;Família e acesso&quot;.
                </p>
              )}

              <SecaoRetratil titulo="Mídia (foto, vídeo, galeria)" abertoPorPadrao={!conteudoFechadoPorPadrao}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Foto do homenageado (máx 10MB)</label>
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
                    <label className="block text-xs text-zinc-500 mb-1">Vídeo (máx 100MB)</label>
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
              </SecaoRetratil>

              <SecaoRetratil titulo="Linha do tempo" abertoPorPadrao={!conteudoFechadoPorPadrao}>
                <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />
              </SecaoRetratil>

              {erro && <p className="text-red-400 text-sm">{erro}</p>}
              {salvo && <p className="text-green-400 text-sm">Salvo.</p>}

              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Família e acesso</h2>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-2">Quem preenche o conteúdo?</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    checked={preenchidoPor === 'familia'}
                    onChange={() => salvarPreenchidoPor('familia')}
                    disabled={salvandoPreenchidoPor}
                  />
                  A família preenche
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    checked={preenchidoPor === 'funeraria'}
                    onChange={() => salvarPreenchidoPor('funeraria')}
                    disabled={salvandoPreenchidoPor}
                  />
                  Nós (a funerária) preenchemos
                </label>
              </div>
            </div>
            <form onSubmit={cadastrarEmailFamilia} className="space-y-2 pt-4 border-t border-zinc-800">
              <label className="block text-xs text-zinc-500 mb-1">E-mail da família</label>
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
                  {cadastrandoFamiliaEmail ? '...' : temSenhaFamilia ? 'Reenviar' : 'Cadastrar'}
                </Button>
              </div>
              {familiaEmailMsg && <p className="text-xs text-zinc-400 mt-2">{familiaEmailMsg}</p>}
            </form>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">
              Moderação do mural {mural.length > 0 ? `(${mural.length})` : ''}
            </h2>
            {mural.length === 0 ? (
              <p className="text-zinc-500 text-xs">Nenhuma memória deixada ainda.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {mural.map((m) => (
                  <li key={m.id} className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm">
                        {m.nome} {m.parentesco && <span className="text-zinc-500 text-xs">· {m.parentesco}</span>}
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5 break-words">{m.texto}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerMemoria(m.id)}
                      disabled={removendoMuralId === m.id}
                      className="text-xs text-zinc-500 hover:text-red-400 whitespace-nowrap shrink-0"
                    >
                      {removendoMuralId === m.id ? '...' : 'Remover'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Armazenamento</h2>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-colors ${
                    usoStorageMB < 250 ? 'bg-green-500' : usoStorageMB < 400 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (usoStorageMB / 500) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 whitespace-nowrap">{usoStorageMB}MB / 500MB</span>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">QR Code e placa</h2>
            <div className="flex items-center gap-3 mb-3">
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeUrl} alt="" className="w-16 h-16 rounded bg-white p-1" />
              ) : (
                <div className="w-16 h-16 rounded bg-zinc-800" />
              )}
              <div className="flex flex-col gap-1">
                {qrCodeUrl && (
                  <a href={qrCodeUrl} download={`qrcode-${memorial.slug}.png`} className="text-blue-400 hover:underline text-xs">
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

            <form onSubmit={salvarMensagemPlaca} className="pt-3 border-t border-zinc-800">
              <label className="block text-xs text-zinc-500 mb-1">Mensagem da placa</label>
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

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Senha de acesso do memorial</h2>
            <form onSubmit={salvarSenha} className="space-y-2">
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
                  {salvandoSenha ? '...' : 'Salvar'}
                </Button>
              </div>
              {senhaMsg && <p className="text-xs text-zinc-400 mt-2">{senhaMsg}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
