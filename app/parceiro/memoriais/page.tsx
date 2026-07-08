'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, getParceiroUser } from '@/lib/auth'
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

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  biografia: string | null
  frase_preferida: string | null
  slug: string | null
  video_url: string | null
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
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

async function subirArquivo(memorialId: string, pasta: 'video' | 'galeria', file: File) {
  const caminho = `${memorialId}/${pasta}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('memoriais').upload(caminho, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('memoriais').getPublicUrl(caminho)
  return data.publicUrl
}

function timelineParaTexto(timeline: Memorial['timeline']) {
  return (timeline || []).map((ev) => `${ev.year || ''} | ${ev.title || ''} | ${ev.description || ''}`).join('\n')
}

function textoParaTimeline(texto: string) {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const [year, title, description] = linha.split('|').map((p) => p?.trim() || '')
      return { year, title, description }
    })
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
  const [videoUrl, setVideoUrl] = useState('')
  const [galeria, setGaleria] = useState<string[]>([])
  const [timelineTexto, setTimelineTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [erro, setErro] = useState('')
  const [rascunhoId, setRascunhoId] = useState('')

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
        'id, nome_completo, data_nascimento, data_falecimento, cidade, biografia, frase_preferida, slug, video_url, galeria_fotos, timeline, created_at'
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
    setVideoUrl('')
    setGaleria([])
    setTimelineTexto('')
    setErro('')

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

  function abrirEdicao(m: Memorial) {
    setEditando(m)
    setForm({
      nome_completo: m.nome_completo,
      data_nascimento: m.data_nascimento || '',
      data_falecimento: m.data_falecimento || '',
      cidade: m.cidade || '',
      frase_preferida: m.frase_preferida || '',
      biografia: m.biografia || '',
    })
    setVideoUrl(m.video_url || '')
    setGaleria(m.galeria_fotos || [])
    setTimelineTexto(timelineParaTexto(m.timeline))
    setErro('')
    setDialogAberto(true)
  }

  const idParaUpload = editando?.id || rascunhoId

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
    setEnviandoGaleria(true)
    setErro('')
    try {
      const urls = await Promise.all(files.map((f) => subirArquivo(idParaUpload, 'galeria', f)))
      setGaleria((atual) => [...atual, ...urls])
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar fotos')
    }
    setEnviandoGaleria(false)
    e.target.value = ''
  }

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
  }

  async function fecharDialog(aberto: boolean) {
    const abandonouRascunhoSemNome = !aberto && editando?.id === rascunhoId && form.nome_completo.trim() === ''

    if (abandonouRascunhoSemNome) {
      // Rascunho criado ao abrir "Novo Memorial" mas fechado sem preencher nome — remove
      await supabase.from('homenagens').delete().eq('id', rascunhoId)
      load()
    }
    setDialogAberto(aberto)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const slug = gerarSlug(form.nome_completo)
    const payload = {
      ...form,
      slug,
      memorial_slug: slug,
      video_url: videoUrl || null,
      galeria_fotos: galeria,
      timeline: textoParaTimeline(timelineTexto),
    }

    const { error } = await supabase.from('homenagens').update(payload).eq('id', idParaUpload)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

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
            </DialogHeader>

            <form onSubmit={salvar} className="space-y-3">
              <Input
                placeholder="Nome completo"
                required
                value={form.nome_completo}
                onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-3">
                <Input
                  placeholder="Data de nascimento"
                  value={form.data_nascimento}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  placeholder="Data de falecimento"
                  value={form.data_falecimento}
                  onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Input
                placeholder="Cidade"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Input
                placeholder="Frase preferida"
                value={form.frase_preferida}
                onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <textarea
                placeholder="Biografia"
                rows={3}
                value={form.biografia}
                onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
              />

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Vídeo</label>
                {videoUrl && (
                  <video src={videoUrl} controls className="w-full rounded-md mb-2 max-h-40 bg-black" />
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
                <label className="block text-xs text-zinc-500 mb-1">Galeria de fotos</label>
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
                  disabled={enviandoGaleria}
                  className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600"
                />
                {enviandoGaleria && <p className="text-xs text-zinc-500 mt-1">Enviando fotos...</p>}
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Linha do tempo — uma por linha: ano | título | descrição
                </label>
                <textarea
                  rows={2}
                  value={timelineTexto}
                  onChange={(e) => setTimelineTexto(e.target.value)}
                  className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <DialogFooter className="bg-transparent border-zinc-800 mt-4">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
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
