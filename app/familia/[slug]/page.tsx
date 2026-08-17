'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'
import { VinculosEditor } from '@/components/admin/VinculosEditor'
import { PrivacidadeFamilia } from '@/components/familia/PrivacidadeFamilia'
import { PALETAS_MEMORIAL } from '@/lib/temasMemorial'
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

async function subirArquivoFamilia(slug: string, pasta: 'foto' | 'video' | 'galeria' | 'videos_galeria', file: File) {
  const formData = new FormData()
  formData.append('slug', slug)
  formData.append('pasta', pasta)
  formData.append('file', file)
  const res = await fetch('/api/familia-upload', { method: 'POST', body: formData })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro ao enviar arquivo')
  return json.url as string
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
  const [erro, setErro] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoVideosGaleria, setEnviandoVideosGaleria] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [updatedAtCarregado, setUpdatedAtCarregado] = useState('')
  const [usoStorageMB, setUsoStorageMB] = useState(0)
  const [preenchidoPor, setPreenchidoPor] = useState<'funeraria' | 'familia' | null>(null)
  const [memorialId, setMemorialId] = useState('')
  const [modoGate, setModoGate] = useState<ModoGate>('aberto')
  const [buscaHabilitada, setBuscaHabilitada] = useState(true)
  const [linkHabilitado, setLinkHabilitado] = useState(true)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(true)

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
    setCarregando(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSalvo(false)

    const res = await fetch('/api/familia-memorial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: params.slug,
        updatedAtEsperado: updatedAtCarregado,
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
      setErro(json.error || 'Erro ao salvar')
      setSalvando(false)
      return
    }

    if (json.updatedAt) setUpdatedAtCarregado(json.updatedAt)
    setSalvando(false)
    setSalvo(true)
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoFoto(true)
    setErro('')
    try {
      setFotoUrl(await subirArquivoFamilia(params.slug, 'foto', file))
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
      setVideoUrl(await subirArquivoFamilia(params.slug, 'video', file))
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
      const urls = await Promise.all(selecionados.map((f) => subirArquivoFamilia(params.slug, 'videos_galeria', f)))
      setVideosGaleria((atual) => [...atual, ...urls])
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoVideosGaleria(false)
    e.target.value = ''
  }

  function removerVideoGaleria(url: string) {
    setVideosGaleria((atual) => atual.filter((u) => u !== url))
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
      const urls = await Promise.all(selecionados.map((f) => subirArquivoFamilia(params.slug, 'galeria', f)))
      setGaleria((atual) => [...atual, ...urls])
    } catch (err: any) {
      setErro(err.message)
    }
    setEnviandoGaleria(false)
    e.target.value = ''
  }

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
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

            {erro && <p className="text-red-400 text-sm">{erro}</p>}
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
