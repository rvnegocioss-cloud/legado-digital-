'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  created_at: string
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
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

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

      if (m.parceiro_id) {
        const { data: p } = await supabase
          .from('parceiros_b2b')
          .select('nome_fantasia, razao_social')
          .eq('id', m.parceiro_id)
          .single()
        setParceiro(p)
      }
    }
    setLoading(false)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    setSalvo(false)

    const { error } = await supabase.from('homenagens').update(form).eq('id', params.id)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setSalvo(true)
    if (memorial) setMemorial({ ...memorial, ...form })
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
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap"
          >
            Acessar página do memorial
          </a>
        )}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 max-w-xl">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Dados do memorial</h2>
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
            rows={4}
            value={form.biografia}
            onChange={(e) => setForm({ ...form, biografia: e.target.value })}
            className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
          />

          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          {salvo && <p className="text-green-400 text-sm">Salvo.</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </form>
      </div>
    </div>
  )
}
