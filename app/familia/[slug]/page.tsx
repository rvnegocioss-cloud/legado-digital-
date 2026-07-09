'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'

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
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
  slug: string | null
}

const LIMITE_FOTOS = 4

async function subirArquivoFamilia(slug: string, pasta: 'foto' | 'video' | 'galeria', file: File) {
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
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineEventos, setTimelineEventos] = useState<TimelineEvento[]>([])

  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)

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
        ...form,
        foto_url: fotoUrl || null,
        video_url: videoUrl || null,
        galeria_fotos: galeria,
        timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      if (res.status === 401) setSessaoInvalida(true)
      setErro(json.error || 'Erro ao salvar')
      setSalvando(false)
      return
    }

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
    <div className="min-h-screen bg-zinc-950 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Editar memorial de {form.nome_completo}</h1>
          <a
            href={`/homenagem/${params.slug}`}
            className="text-blue-400 hover:underline text-xs whitespace-nowrap"
          >
            Ver página →
          </a>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <form onSubmit={salvar} className="space-y-3">
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

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Foto do homenageado</label>
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
              <label className="block text-xs text-zinc-500 mb-1">Vídeo</label>
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
        </div>
      </div>
    </div>
  )
}
