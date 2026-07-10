'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimelineEditor, type TimelineEvento } from '@/components/admin/TimelineEditor'

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
  galeria_fotos: string[] | null
  timeline: { year?: string; title?: string; description?: string }[] | null
  qr_code_url: string | null
  mensagem_placa: string | null
  familia_email: string | null
  created_at: string
}

const LIMITE_FOTOS = 4 // MVP — revisar conforme plano de storage contratado

async function subirArquivo(memorialId: string, pasta: 'foto' | 'video' | 'galeria', file: File) {
  const caminho = `${memorialId}/${pasta}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('memoriais').upload(caminho, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('memoriais').getPublicUrl(caminho)
  return data.publicUrl
}

interface Parceiro {
  nome_fantasia: string | null
  razao_social: string
}

export default function DetalheMemorial() {
  const params = useParams<{ id: string }>()
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
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
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [enviandoGaleria, setEnviandoGaleria] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)
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
    if (params.id) load(params.id)
  }, [params.id])

  async function load(id: string) {
    setLoading(true)
    const { data: m } = await supabase.from('homenagens').select('*').eq('id', id).single()
    setMemorial(m)

    if (m) {
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
      setMensagemPlaca(m.mensagem_placa || '')
      setFamiliaEmail(m.familia_email || '')
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

      if (m.qr_code_url) {
        setQrCodeUrl(m.qr_code_url)
      } else if (m.slug) {
        gerarQrCodeCliente(m.id).then((url) => { if (url) setQrCodeUrl(url) })
      }
    }
    setLoading(false)
  }

  async function gerarQrCode() {
    if (!memorial) return
    setGerandoQrCode(true)
    const url = await gerarQrCodeCliente(memorial.id)
    if (url) setQrCodeUrl(url)
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
      setFamiliaEmailMsg(`Cadastrado, mas o e-mail não saiu (Resend não configurado). Senha gerada: ${json.senha} — repasse manualmente.`)
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
      setMensagemPlacaMsg('Salvo, mas o e-mail de confirmação não saiu (Resend não configurado).')
    } else {
      setMensagemPlacaMsg('Salvo — sem mensagem, o QR Code segue direto pro fornecedor.')
    }
    setSalvandoMensagemPlaca(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSalvo(false)

    const payload = {
      ...form,
      foto_url: fotoUrl || null,
      video_url: videoUrl || null,
      galeria_fotos: galeria,
      timeline: timelineEventos.filter((ev) => ev.year || ev.title || ev.description),
    }
    const { error } = await supabase.from('homenagens').update(payload).eq('id', params.id)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setSalvo(true)
    if (memorial) setMemorial({ ...memorial, ...form })
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

  function removerFoto(url: string) {
    setGaleria((atual) => atual.filter((u) => u !== url))
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>
  if (!memorial) return <p className="text-zinc-400">Memorial não encontrado.</p>

  return (
    <div>
      <Link href="/admin/memoriais" className="text-sm text-zinc-400 hover:text-white">
        ← Voltar pra Memoriais
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{memorial.nome_completo}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {parceiro
              ? `Cadastrado por ${parceiro.nome_fantasia || parceiro.razao_social}`
              : 'Cadastrado diretamente pela Legado Digital'}
          </p>
        </div>
        {memorial.slug && (
          <a
            href={`/homenagem/${memorial.slug}`}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap"
          >
            Acessar página do memorial
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 p-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Dados do memorial</h2>
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
              rows={4}
              value={form.biografia}
              onChange={(e) => setForm({ ...form, biografia: e.target.value })}
              className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
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
            {videoUrl && (
              <video src={videoUrl} controls className="w-full rounded-md mb-2 max-h-48 bg-black" />
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

          <TimelineEditor value={timelineEventos} onChange={setTimelineEventos} />

          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          {salvo && <p className="text-green-400 text-sm">Salvo.</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 lg:self-start">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">QR Code do memorial</h2>
        <div className="flex items-center gap-4">
          {qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeUrl} alt="" className="w-28 h-28 rounded bg-white p-1.5" />
          ) : (
            <div className="w-28 h-28 rounded bg-zinc-800" />
          )}
          <div className="flex flex-col gap-2">
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`qrcode-${memorial.slug}.png`}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center"
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

        <form onSubmit={salvarMensagemPlaca} className="mt-5 pt-4 border-t border-zinc-800">
          <label className="block text-xs text-zinc-500 mb-1">Mensagem da placa</label>
          <p className="text-zinc-500 text-xs mb-2">
            Texto que a família quer gravado na placa junto do QR Code — vai anexado no e-mail
            pro fornecedor de placas, pra confeccionar tudo junto.
          </p>
          <textarea
            rows={3}
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
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 max-w-xl mt-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-1">Privacidade — senha de acesso</h2>
        <p className="text-zinc-500 text-xs mb-4">
          {temSenha
            ? 'Este memorial exige senha na busca pública E pra abrir a página direto (link ou QR Code). Deixe o campo em branco e salve pra tornar público de novo.'
            : 'Este memorial está público — qualquer um encontra pelo nome na busca ou abre direto pelo link/QR Code. Defina uma senha pra exigir acesso restrito em ambos.'}
        </p>
        <form onSubmit={salvarSenha} className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">
              {temSenha ? 'Nova senha (ou deixe em branco pra remover)' : 'Senha de acesso'}
            </label>
            <Input
              type="text"
              placeholder="Deixe em branco pra público"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <Button type="submit" disabled={salvandoSenha} className="self-end">
            {salvandoSenha ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
        {senhaMsg && <p className="text-xs text-zinc-400 mt-2">{senhaMsg}</p>}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 max-w-xl mt-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-1">E-mail da família</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Cadastre o e-mail de contato da família — o sistema gera uma senha simples sozinho e
          manda por e-mail. Ela usa essa senha pra entrar em /familia/login e enviar fotos, vídeo
          e a história. Esse e-mail também recebe o pedido de confirmação da mensagem da placa.
        </p>
        <form onSubmit={cadastrarEmailFamilia} className="flex gap-3">
          <Input
            type="email"
            placeholder="email@familia.com"
            required
            value={familiaEmail}
            onChange={(e) => setFamiliaEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white flex-1"
          />
          <Button type="submit" disabled={cadastrandoFamiliaEmail} className="whitespace-nowrap">
            {cadastrandoFamiliaEmail ? 'Cadastrando...' : temSenhaFamilia ? 'Gerar nova senha' : 'Cadastrar'}
          </Button>
        </form>
        {familiaEmailMsg && <p className="text-xs text-zinc-400 mt-2">{familiaEmailMsg}</p>}
      </div>
    </div>
  )
}
