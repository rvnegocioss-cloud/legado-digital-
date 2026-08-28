'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { gerarSlugUnico } from '@/lib/gerarSlug'
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
  parceiro_id: string | null
}

interface Parceiro {
  id: string
  nome_fantasia: string | null
  razao_social: string
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
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [abertoId, setAbertoId] = useState<string | null>(null)
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
      .select('id, nome_completo, data_nascimento, data_falecimento, cidade, slug, created_at, parceiro_id')
      .order('created_at', { ascending: false })
    if (data) setMemoriais(data)

    const { data: parceirosData } = await supabase
      .from('parceiros_b2b')
      .select('id, nome_fantasia, razao_social')
      .order('razao_social')
    if (parceirosData) setParceiros(parceirosData)

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

    const slug = await gerarSlugUnico(supabase, form.nome_completo)
    const { data, error } = await supabase
      .from('homenagens')
      .insert({ ...form, slug, memorial_slug: slug })
      .select()
      .single()

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    if (data) gerarQrCodeCliente(data.id)

    setSalvando(false)
    setDialogAberto(false)
    loadMemoriais()
  }

  if (loading) {
    return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Memoriais</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirNovo}>+ Novo Memorial</Button>} />
          <DialogContent className="bg-[var(--tema-zinc-900)] text-white ring-[var(--tema-zinc-800)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Memorial</DialogTitle>
            </DialogHeader>
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Nome completo</label>
                <Input
                  placeholder="Nome completo do falecido"
                  required
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Data de nascimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_nascimento}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Data de falecimento</label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.data_falecimento}
                    onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Cidade</label>
                <Input
                  placeholder="Cidade onde viveu ou faleceu"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Frase preferida</label>
                <Input
                  placeholder="Uma frase marcante da pessoa"
                  value={form.frase_preferida}
                  onChange={(e) => setForm({ ...form, frase_preferida: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Biografia</label>
                <textarea
                  placeholder="Conte a história de vida da pessoa"
                  rows={3}
                  value={form.biografia}
                  onChange={(e) => setForm({ ...form, biografia: e.target.value })}
                  className="flex w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)]"
                />
              </div>
              {erro && <p className="text-red-400 text-sm">{erro}</p>}
              <DialogFooter className="bg-transparent border-[var(--tema-zinc-800)] mt-4">
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
          <p className="text-[var(--tema-zinc-400)]">Nenhum memorial cadastrado ainda.</p>
        </div>
      ) : (
        (() => {
          const parceiroPorId = new Map(parceiros.map((p) => [p.id, p]))
          const grupos = new Map<string, { parceiro: Parceiro | null; memoriais: Memorial[] }>()
          for (const m of memoriais) {
            const chave = m.parceiro_id || 'sem-parceiro'
            if (!grupos.has(chave)) {
              grupos.set(chave, { parceiro: m.parceiro_id ? parceiroPorId.get(m.parceiro_id) || null : null, memoriais: [] })
            }
            grupos.get(chave)!.memoriais.push(m)
          }
          const listaGrupos = Array.from(grupos.entries()).sort(([chaveA, a], [chaveB, b]) => {
            if (chaveA === 'sem-parceiro') return 1
            if (chaveB === 'sem-parceiro') return -1
            const nomeA = a.parceiro?.nome_fantasia || a.parceiro?.razao_social || ''
            const nomeB = b.parceiro?.nome_fantasia || b.parceiro?.razao_social || ''
            return nomeA.localeCompare(nomeB)
          })

          return (
            <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] divide-y divide-[var(--tema-zinc-800)]">
              {listaGrupos.map(([chave, grupo]) => {
                const aberto = abertoId === chave
                const nome = grupo.parceiro
                  ? grupo.parceiro.nome_fantasia || grupo.parceiro.razao_social
                  : 'Memoriais Legado Digital (nosso, sem parceiro)'
                return (
                  <div key={chave}>
                    <button
                      onClick={() => setAbertoId(aberto ? null : chave)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--tema-zinc-800)]/40 transition-colors"
                    >
                      <span className="text-white font-medium text-sm">{nome}</span>
                      <span className="text-[var(--tema-zinc-500)] text-xs">
                        {grupo.memoriais.length} memorial{grupo.memoriais.length === 1 ? '' : 'is'} {aberto ? '▲' : '▼'}
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[var(--tema-zinc-500)] text-xs">
                              <th className="text-left py-2 px-2">Nome</th>
                              <th className="text-left py-2 px-2">Nascimento</th>
                              <th className="text-left py-2 px-2">Falecimento</th>
                              <th className="text-left py-2 px-2">Cidade</th>
                              <th className="text-left py-2 px-2">Criado em</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.memoriais.map((m) => (
                              <tr key={m.id} className="border-t border-[var(--tema-zinc-800)]/50">
                                <td className="py-2 px-2 text-white">
                                  <Link href={`/admin/memoriais/${m.id}`} className="hover:text-blue-400 hover:underline">
                                    {m.nome_completo}
                                  </Link>
                                </td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.data_nascimento || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.data_falecimento || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.cidade || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-400)]">
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
              })}
            </div>
          )
        })()
      )}
    </div>
  )
}
