'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Lapide {
  id: string
  identificacao: string
  quadra: string | null
  lote: string | null
  observacoes: string | null
  created_at: string
}

const FORM_INICIAL = { identificacao: '', quadra: '', lote: '', observacoes: '' }

export default function LapidesCemiterio() {
  const { id } = useParams<{ id: string }>()
  const [cemiterioNome, setCemiterioNome] = useState('')
  const [lapides, setLapides] = useState<Lapide[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: cemiterio } = await supabase.from('cemiterios').select('nome').eq('id', id).single()
    setCemiterioNome(cemiterio?.nome || '')

    const { data } = await supabase
      .from('lapides')
      .select('*')
      .eq('cemiterio_id', id)
      .order('created_at', { ascending: false })
    setLapides(data || [])
    setLoading(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const { error } = await supabase.from('lapides').insert({ ...form, cemiterio_id: id })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setForm(FORM_INICIAL)
    setSalvando(false)
    load()
  }

  async function remover(lapideId: string) {
    await supabase.from('lapides').delete().eq('id', lapideId)
    load()
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <Link href="/admin/cemiterios" className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Cemitérios
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Lápides — {cemiterioNome}</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Cada lápide é o ponto físico (quadra/lote/número) onde um memorial pode ser vinculado.
      </p>

      <form onSubmit={salvar} className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8 space-y-3 max-w-lg">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Identificação</label>
          <Input
            placeholder="Ex: Q-12 L-23"
            required
            value={form.identificacao}
            onChange={(e) => setForm({ ...form, identificacao: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Quadra</label>
            <Input
              value={form.quadra}
              onChange={(e) => setForm({ ...form, quadra: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Lote</label>
            <Input
              value={form.lote}
              onChange={(e) => setForm({ ...form, lote: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Observações</label>
          <Input
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : '+ Adicionar Lápide'}
        </Button>
      </form>

      {lapides.length === 0 ? (
        <p className="text-zinc-400">Nenhuma lápide cadastrada neste cemitério ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Identificação</th>
                <th className="text-left py-3 px-4">Quadra</th>
                <th className="text-left py-3 px-4">Lote</th>
                <th className="text-left py-3 px-4">Observações</th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {lapides.map((l) => (
                <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{l.identificacao}</td>
                  <td className="py-3 px-4 text-zinc-300">{l.quadra || '—'}</td>
                  <td className="py-3 px-4 text-zinc-300">{l.lote || '—'}</td>
                  <td className="py-3 px-4 text-zinc-400">{l.observacoes || '—'}</td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/cemiterios/${id}/lapides/${l.id}/gavetas`} className="text-zinc-400 hover:text-white text-xs">
                      Gavetas
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/cemiterios/${id}/lapides/${l.id}/gavetas-3d`} className="text-xs" style={{ color: '#C9A46A' }}>
                      Gavetas 3D
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => remover(l.id)} className="text-zinc-500 hover:text-red-400 text-xs">
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
