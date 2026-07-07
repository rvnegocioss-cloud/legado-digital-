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
  created_at: string
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
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

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
      .select('id, nome_completo, data_nascimento, data_falecimento, cidade, biografia, frase_preferida, created_at')
      .order('created_at', { ascending: false })

    if (meuParceiroId) {
      query = query.eq('parceiro_id', meuParceiroId)
    }

    const { data } = await query
    setMemoriais(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErro('')
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
    setErro('')
    setDialogAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const { error } = editando
      ? await supabase.from('homenagens').update(form).eq('id', editando.id)
      : await supabase.from('homenagens').insert({ ...form, parceiro_id: parceiroId })

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
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
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
