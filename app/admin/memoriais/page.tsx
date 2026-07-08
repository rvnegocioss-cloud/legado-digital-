'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
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
  slug: string | null
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

const FORM_INICIAL = {
  nome_completo: '',
  data_nascimento: '',
  data_falecimento: '',
  cidade: '',
  frase_preferida: '',
  biografia: '',
}

export default function AdminMemoriais() {
  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    loadMemoriais()
  }, [])

  async function loadMemoriais() {
    setLoading(true)
    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, data_nascimento, data_falecimento, cidade, slug, created_at')
      .order('created_at', { ascending: false })
    if (data) setMemoriais(data)
    setLoading(false)
  }

  function abrirNovo() {
    setForm(FORM_INICIAL)
    setErro('')
    setDialogAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const slug = gerarSlug(form.nome_completo)
    const { error } = await supabase
      .from('homenagens')
      .insert({ ...form, slug, memorial_slug: slug })

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setDialogAberto(false)
    loadMemoriais()
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Memoriais</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirNovo}>+ Novo Memorial</Button>} />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Memorial</DialogTitle>
            </DialogHeader>
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
                  rows={3}
                  value={form.biografia}
                  onChange={(e) => setForm({ ...form, biografia: e.target.value })}
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
                <th className="text-left py-3 px-4">Nascimento</th>
                <th className="text-left py-3 px-4">Falecimento</th>
                <th className="text-left py-3 px-4">Cidade</th>
                <th className="text-left py-3 px-4">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">
                    <Link href={`/admin/memoriais/${m.id}`} className="hover:text-blue-400 hover:underline">
                      {m.nome_completo}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{m.data_nascimento || '-'}</td>
                  <td className="py-3 px-4 text-zinc-300">{m.data_falecimento || '-'}</td>
                  <td className="py-3 px-4 text-zinc-300">{m.cidade || '-'}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
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
