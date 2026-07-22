'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  observacoes: string | null
  homenagens: Homenagem | null
}

const FORM_INICIAL = { codigo: '', linha: '1', coluna: '1', homenagem_id: '', observacoes: '' }

export default function GavetasLapide() {
  const { id, lapideId } = useParams<{ id: string; lapideId: string }>()
  const [lapideNome, setLapideNome] = useState('')
  const [gavetas, setGavetas] = useState<Gaveta[]>([])
  const [homenagens, setHomenagens] = useState<Homenagem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: lapide } = await supabase.from('lapides').select('identificacao').eq('id', lapideId).single()
    setLapideNome(lapide?.identificacao || '')

    const { data } = await supabase
      .from('gavetas')
      .select('id, codigo, linha, coluna, homenagem_id, observacoes, homenagens(id, nome_completo, slug)')
      .eq('lapide_id', lapideId)
      .order('linha', { ascending: true })
      .order('coluna', { ascending: true })
    setGavetas((data as any) || [])

    const { data: homenagensData } = await supabase
      .from('homenagens')
      .select('id, nome_completo, slug')
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

    const { error } = await supabase.from('gavetas').insert({
      lapide_id: lapideId,
      codigo: form.codigo,
      linha: parseInt(form.linha, 10) || 1,
      coluna: parseInt(form.coluna, 10) || 1,
      homenagem_id: form.homenagem_id || null,
      observacoes: form.observacoes || null,
    })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setForm(FORM_INICIAL)
    setSalvando(false)
    load()
  }

  async function remover(gavetaId: string) {
    await supabase.from('gavetas').delete().eq('id', gavetaId)
    load()
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <Link href={`/admin/cemiterios/${id}/lapides`} className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Lápides
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Gavetas — {lapideNome}</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Cada gaveta é uma posição física dentro do jazigo. Vincule um memorial já cadastrado pra marcar quem está ali.
      </p>

      <form onSubmit={salvar} className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8 space-y-3 max-w-lg">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Código</label>
          <Input
            placeholder="Ex: G1"
            required
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Andar (linha)</label>
            <Input
              type="number"
              min={1}
              value={form.linha}
              onChange={(e) => setForm({ ...form, linha: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Coluna (1 ou 2)</label>
            <Input
              type="number"
              min={1}
              max={2}
              value={form.coluna}
              onChange={(e) => setForm({ ...form, coluna: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Memorial vinculado (opcional)</label>
          <select
            value={form.homenagem_id}
            onChange={(e) => setForm({ ...form, homenagem_id: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm"
          >
            <option value="">— Vaga —</option>
            {homenagens.map((h) => (
              <option key={h.id} value={h.id}>{h.nome_completo}</option>
            ))}
          </select>
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
          {salvando ? 'Salvando...' : '+ Adicionar Gaveta'}
        </Button>
      </form>

      {gavetas.length === 0 ? (
        <p className="text-zinc-400">Nenhuma gaveta cadastrada nesse jazigo ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Andar</th>
                <th className="text-left py-3 px-4">Coluna</th>
                <th className="text-left py-3 px-4">Memorial</th>
                <th className="text-left py-3 px-4">Observações</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {gavetas.map((g) => (
                <tr key={g.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{g.codigo}</td>
                  <td className="py-3 px-4 text-zinc-300">{g.linha}º</td>
                  <td className="py-3 px-4 text-zinc-300">{g.coluna}</td>
                  <td className="py-3 px-4">
                    {g.homenagens ? (
                      <Link href={`/homenagem/${g.homenagens.slug}`} className="hover:underline" style={{ color: '#C9A46A' }}>
                        {g.homenagens.nome_completo}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">Vaga</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{g.observacoes || '—'}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => remover(g.id)} className="text-zinc-500 hover:text-red-400 text-xs">
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
