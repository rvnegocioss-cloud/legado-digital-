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

interface Parceiro {
  id: string
  razao_social: string
  nome_fantasia: string | null
  tipo_parceiro: string
  email: string | null
  telefone: string | null
  cnpj: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  created_at: string
}

const TIPOS_PARCEIRO = [
  { value: 'funeraria', label: 'Funerária' },
  { value: 'plano_funerario', label: 'Plano Funerário' },
  { value: 'prefeitura', label: 'Prefeitura' },
  { value: 'autarquia', label: 'Autarquia' },
  { value: 'concessionaria', label: 'Concessionária' },
  { value: 'associacao', label: 'Associação' },
  { value: 'entidade_religiosa', label: 'Entidade Religiosa' },
  { value: 'canal_comercial', label: 'Canal Comercial' },
]

const FORM_INICIAL = {
  razao_social: '',
  nome_fantasia: '',
  tipo_parceiro: 'funeraria',
  email: '',
  telefone: '',
  cnpj: '',
  cidade: '',
  estado: '',
}

export default function AdminParceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Parceiro | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    loadParceiros()
  }, [])

  async function loadParceiros() {
    setLoading(true)
    const { data } = await supabase
      .from('parceiros_b2b')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setParceiros(data)
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErro('')
    setDialogAberto(true)
  }

  function abrirEdicao(p: Parceiro) {
    setEditando(p)
    setForm({
      razao_social: p.razao_social,
      nome_fantasia: p.nome_fantasia || '',
      tipo_parceiro: p.tipo_parceiro,
      email: p.email || '',
      telefone: p.telefone || '',
      cnpj: p.cnpj || '',
      cidade: p.cidade || '',
      estado: p.estado || '',
    })
    setErro('')
    setDialogAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const payload = { ...form, updated_at: new Date().toISOString() }

    const { error } = editando
      ? await supabase.from('parceiros_b2b').update(payload).eq('id', editando.id)
      : await supabase.from('parceiros_b2b').insert(payload)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setDialogAberto(false)
    loadParceiros()
  }

  async function alternarAtivo(p: Parceiro) {
    await supabase.from('parceiros_b2b').update({ ativo: !p.ativo }).eq('id', p.id)
    loadParceiros()
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Parceiros B2B</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger
            render={
              <Button onClick={abrirNovo}>
                + Novo Parceiro
              </Button>
            }
          />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Parceiro' : 'Novo Parceiro'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={salvar} className="space-y-3">
              <Input
                placeholder="Razão social"
                required
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Input
                placeholder="Nome fantasia"
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <select
                value={form.tipo_parceiro}
                onChange={(e) => setForm({ ...form, tipo_parceiro: e.target.value })}
                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                {TIPOS_PARCEIRO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Input
                placeholder="CNPJ"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-3">
                <Input
                  placeholder="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  className="bg-zinc-800 border-zinc-700 text-white w-20"
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

      {parceiros.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum parceiro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Criado em</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {parceiros.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">
                    <Link href={`/admin/parceiros/${p.id}`} className="hover:text-blue-400 hover:underline">
                      {p.nome_fantasia || p.razao_social}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{p.email}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    {TIPOS_PARCEIRO.find((t) => t.value === p.tipo_parceiro)?.label || p.tipo_parceiro}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => alternarAtivo(p)}
                      className={`px-2 py-1 rounded text-xs ${
                        p.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => abrirEdicao(p)}
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
