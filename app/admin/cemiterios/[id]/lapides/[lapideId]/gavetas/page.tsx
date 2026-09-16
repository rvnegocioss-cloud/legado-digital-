'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { urlMidiaProtegida } from '@/lib/urlMidia'

interface Homenagem {
  id: string
  nome_completo: string
  slug: string
}

interface Gaveta {
  id: string
  codigo: string
  linha: number
  coluna: number
  homenagem_id: string | null
  nome_sem_memorial: string | null
  observacoes: string | null
  homenagens: Homenagem | null
}

const FORM_INICIAL = { codigo: '', linha: '1', coluna: '1', homenagem_id: '', nome_sem_memorial: '', observacoes: '' }

export default function GavetasLapide() {
  const { id, lapideId } = useParams<{ id: string; lapideId: string }>()
  const [lapideCodigo, setLapideCodigo] = useState('')
  // Nome do jazigo ("Jazigo Família Saraiva") -- é o título do card do mapa,
  // e esta é a única tela onde ele se edita (2026-09-15).
  const [lapideNome, setLapideNome] = useState('')
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeInput, setNomeInput] = useState('')
  // Foto da face do túmulo (o que está gravado na pedra). Captura de drone é
  // reta de cima e nunca mostra a face vertical, então a foto de perto é a
  // única forma de identificar o túmulo -- e a prova de que alguém esteve lá,
  // por isso ela é o que marca o túmulo como conferido em campo.
  const [fotoLapide, setFotoLapide] = useState<string | null>(null)
  const [subindoFoto, setSubindoFoto] = useState(false)
  const [removendoFoto, setRemovendoFoto] = useState(false)
  const [gavetas, setGavetas] = useState<Gaveta[]>([])
  const [homenagens, setHomenagens] = useState<Homenagem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_INICIAL)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: lapide } = await supabase.from('lapides').select('identificacao, nome, foto_face_url').eq('id', lapideId).single()
    setLapideCodigo(lapide?.identificacao || '')
    setLapideNome(lapide?.nome || '')
    setFotoLapide(lapide?.foto_face_url || null)

    const { data } = await supabase
      .from('gavetas')
      .select('id, codigo, linha, coluna, homenagem_id, nome_sem_memorial, observacoes, homenagens(id, nome_completo, slug)')
      .eq('lapide_id', lapideId)
      .order('linha', { ascending: true })
      .order('coluna', { ascending: true })
    setGavetas((data as any) || [])

    // Só os memoriais DESTE túmulo. Antes o campo listava o sistema inteiro --
    // memorial de outro cemitério, de outro parceiro e até rascunho apareciam,
    // e era fácil vincular a gaveta na pessoa errada.
    const { data: homenagensData } = await supabase
      .from('homenagens')
      .select('id, nome_completo, slug')
      .eq('lapide_id', lapideId)
      .not('slug', 'like', 'rascunho-%')
      .neq('nome_completo', 'Novo memorial')
      .order('nome_completo', { ascending: true })
    setHomenagens(homenagensData || [])

    setLoading(false)
  }, [lapideId])

  useEffect(() => {
    load()
  }, [load])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    // Memorial vinculado manda: quem virou memorial não é mais "só um nome"
    // -- guardar os dois faria a mesma pessoa aparecer duas vezes no card.
    const payload = {
      codigo: form.codigo,
      linha: parseInt(form.linha, 10) || 1,
      coluna: parseInt(form.coluna, 10) || 1,
      homenagem_id: form.homenagem_id || null,
      nome_sem_memorial: form.homenagem_id ? null : form.nome_sem_memorial.trim() || null,
      observacoes: form.observacoes || null,
    }

    const { error } = editandoId
      ? await supabase.from('gavetas').update(payload).eq('id', editandoId)
      : await supabase.from('gavetas').insert({ ...payload, lapide_id: lapideId })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setForm(FORM_INICIAL)
    setEditandoId(null)
    setSalvando(false)
    load()
  }

  function editar(g: Gaveta) {
    setEditandoId(g.id)
    setForm({
      codigo: g.codigo,
      linha: String(g.linha),
      coluna: String(g.coluna),
      homenagem_id: g.homenagem_id || '',
      nome_sem_memorial: g.nome_sem_memorial || '',
      observacoes: g.observacoes || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function subirFotoLapide(arquivo: File) {
    setSubindoFoto(true)
    setErro('')
    try {
      const caminho = `tumulos/${id}/${lapideId}/${Date.now()}-${arquivo.name}`
      const { error: erroUpload } = await supabase.storage.from('memoriais').upload(caminho, arquivo, { upsert: true })
      if (erroUpload) throw erroUpload
      const { data } = supabase.storage.from('memoriais').getPublicUrl(caminho)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Foto de perto só existe se alguém esteve no túmulo fisicamente --
      // então subir a foto confirma o túmulo (pino verde no mapa).
      const { error } = await supabase
        .from('lapides')
        .update({
          foto_face_url: data.publicUrl,
          situacao: 'confirmada',
          confirmada_em: new Date().toISOString(),
          confirmada_por: session?.user?.id || null,
        })
        .eq('id', lapideId)
      if (error) throw error
      setFotoLapide(data.publicUrl)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar a foto.')
    }
    setSubindoFoto(false)
  }

  // Tirar a foto devolve o túmulo pra "não conferido" (a rota faz os dois numa
  // transação só) -- senão o mapa seguiria com pino verde sem nada sustentando.
  async function removerFotoLapide() {
    setRemovendoFoto(true)
    setErro('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/remover-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ recurso: 'foto_tumulo', id: lapideId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Não foi possível remover a foto')
      setFotoLapide(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover a foto.')
    }
    setRemovendoFoto(false)
  }

  async function salvarNomeJazigo() {
    const nome = nomeInput.trim()
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('lapides').update({ nome: nome || null }).eq('id', lapideId)
    if (error) setErro(error.message)
    else {
      setLapideNome(nome)
      setEditandoNome(false)
    }
    setSalvando(false)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setForm(FORM_INICIAL)
  }

  async function remover(gavetaId: string) {
    await supabase.from('gavetas').delete().eq('id', gavetaId)
    if (editandoId === gavetaId) cancelarEdicao()
    load()
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <Link href={`/admin/cemiterios/${id}/lapides`} className="text-[var(--tema-zinc-400)] hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Jazigos
      </Link>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">{lapideNome || `Jazigo ${lapideCodigo}`}</h1>
        <Link
          href={`/admin/cemiterios/${id}/lapides/${lapideId}/gavetas-3d`}
          className="text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
        >
          Ver Gavetas 3D →
        </Link>
      </div>

      {/* Nome do jazigo: é o título que aparece no card do mapa. Sem nome, o
          card cai no código técnico (Q36-R01-T011), que não diz nada pra quem
          olha (2026-09-15). */}
      {editandoNome ? (
        <div className="flex items-center gap-2 mb-2 max-w-lg">
          <Input
            autoFocus
            placeholder="Ex: Jazigo Família Saraiva"
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvarNomeJazigo()
              if (e.key === 'Escape') setEditandoNome(false)
            }}
            className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
          />
          <Button type="button" onClick={salvarNomeJazigo} disabled={salvando}>
            Salvar
          </Button>
          <button type="button" onClick={() => setEditandoNome(false)} className="text-sm text-[var(--tema-zinc-400)] hover:text-white">
            Cancelar
          </button>
        </div>
      ) : (
        <p className="text-[var(--tema-zinc-400)] text-sm mb-2">
          Código do jazigo: {lapideCodigo} ·{' '}
          <button
            type="button"
            onClick={() => {
              setNomeInput(lapideNome)
              setEditandoNome(true)
            }}
            className="underline"
            style={{ color: '#C9A46A' }}
          >
            {lapideNome ? 'Renomear jazigo' : 'Dar nome ao jazigo'}
          </button>
        </p>
      )}

      <p className="text-[var(--tema-zinc-400)] text-sm mb-6">
        Cada gaveta é uma posição física dentro do jazigo. Vincule um memorial já cadastrado pra marcar quem está ali — ou,
        se a pessoa ainda não tem memorial, escreva só o nome dela.
      </p>

      {/* Foto da lápide: é ela que aparece no topo do card do jazigo no mapa,
          e é o que marca o túmulo como conferido em campo (2026-09-15). */}
      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5 mb-8 max-w-lg">
        <h2 className="text-sm font-semibold text-white mb-1">Foto da lápide</h2>
        <p className="text-[11px] text-[var(--tema-zinc-500)] mb-3">
          Tirada de perto, no cemitério. Aparece no topo do card deste jazigo no mapa e marca o túmulo como conferido em campo —
          foto de drone é reta de cima e nunca mostra o nome gravado na pedra.
        </p>
        {fotoLapide && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlMidiaProtegida(fotoLapide) || fotoLapide}
            alt="Foto da lápide"
            className="w-full max-w-xs rounded-lg mb-3"
          />
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium cursor-pointer" style={{ color: '#C9A46A' }}>
            {subindoFoto ? 'Enviando...' : fotoLapide ? 'Trocar foto' : 'Anexar foto da lápide'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={subindoFoto}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) subirFotoLapide(f)
                e.target.value = ''
              }}
            />
          </label>
          {fotoLapide && (
            <button
              type="button"
              disabled={removendoFoto}
              onClick={removerFotoLapide}
              className="text-sm text-[var(--tema-zinc-500)] hover:text-red-400"
            >
              {removendoFoto ? 'Removendo...' : 'Remover foto (volta a não conferido)'}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={salvar} className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6 mb-8 space-y-3 max-w-lg">
        {editandoId && (
          <p className="text-xs" style={{ color: '#C9A46A' }}>
            Editando a gaveta {gavetas.find((g) => g.id === editandoId)?.codigo} —{' '}
            <button type="button" onClick={cancelarEdicao} className="underline">
              cancelar
            </button>
          </p>
        )}
        <div>
          <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Código</label>
          <Input
            placeholder="Ex: G1"
            required
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Andar (linha)</label>
            <Input
              type="number"
              min={1}
              value={form.linha}
              onChange={(e) => setForm({ ...form, linha: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Coluna (1 ou 2)</label>
            <Input
              type="number"
              min={1}
              max={2}
              value={form.coluna}
              onChange={(e) => setForm({ ...form, coluna: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Memorial vinculado (opcional)</label>
          <select
            value={form.homenagem_id}
            onChange={(e) => setForm({ ...form, homenagem_id: e.target.value })}
            className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white rounded-md px-3 py-2 text-sm"
          >
            <option value="">— Vaga —</option>
            {homenagens.map((h) => (
              <option key={h.id} value={h.id}>{h.nome_completo}</option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">
            {homenagens.length === 0
              ? 'Nenhum memorial vinculado a este túmulo ainda — vincule o memorial ao túmulo primeiro, na ficha dele.'
              : 'Só aparecem os memoriais já vinculados a este túmulo.'}
          </p>
        </div>
        {/* Quem está enterrado ali mas ainda não tem memorial digital (parente
            antigo, por exemplo). Aparece no card do mapa como texto, sem link.
            Some quando a gaveta ganha memorial -- é a mesma pessoa. */}
        {!form.homenagem_id && (
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Nome de quem está aqui (sem memorial ainda)</label>
            <Input
              placeholder="Ex: Maria Saraiva"
              value={form.nome_sem_memorial}
              onChange={(e) => setForm({ ...form, nome_sem_memorial: e.target.value })}
              className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
            />
            <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">
              Aparece no mapa junto com os outros do jazigo. Deixe vazio se a gaveta está vaga.
            </p>
          </div>
        )}
        <div>
          <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Observações</label>
          <Input
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
          />
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editandoId ? 'Salvar alteração' : '+ Adicionar Gaveta'}
          </Button>
          {editandoId && (
            <button type="button" onClick={cancelarEdicao} className="text-sm text-[var(--tema-zinc-400)] hover:text-white">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {gavetas.length === 0 ? (
        <p className="text-[var(--tema-zinc-400)]">Nenhuma gaveta cadastrada nesse jazigo ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--tema-zinc-400)] border-b border-[var(--tema-zinc-800)]">
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Andar</th>
                <th className="text-left py-3 px-4">Coluna</th>
                <th className="text-left py-3 px-4">Memorial</th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {gavetas.map((g) => (
                <tr key={g.id} className="border-b border-[var(--tema-zinc-800)]/50 hover:bg-[var(--tema-zinc-900)]/50">
                  <td className="py-3 px-4 text-white">{g.codigo}</td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-300)]">{g.linha}º</td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-300)]">{g.coluna}</td>
                  <td className="py-3 px-4">
                    {g.homenagens ? (
                      <Link href={`/homenagem/${g.homenagens.slug}`} className="hover:underline" style={{ color: '#C9A46A' }}>
                        {g.homenagens.nome_completo}
                      </Link>
                    ) : g.nome_sem_memorial ? (
                      <span className="text-[var(--tema-zinc-300)]">
                        {g.nome_sem_memorial}
                        <span className="text-[var(--tema-zinc-500)] text-xs"> · sem memorial</span>
                      </span>
                    ) : (
                      <span className="text-[var(--tema-zinc-500)]">Vaga</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => editar(g)} className="text-[var(--tema-zinc-400)] hover:text-white text-xs">
                      Editar
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => remover(g.id)} className="text-[var(--tema-zinc-500)] hover:text-red-400 text-xs">
                      Remover
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
