'use client'

import { useEffect, useState } from 'react'
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

const PAPEIS_STAFF = ['Admin Legado Digital', 'Operador Legado Digital']

interface Usuario {
  id: string
  nome: string
  email: string
  ativo: boolean
  criado_em: string
  usuarios_perfis: { perfis: { nome: string } | null }[]
}

function papelDe(u: Usuario) {
  return u.usuarios_perfis.map((up) => up.perfis?.nome).find((n) => n && PAPEIS_STAFF.includes(n)) || null
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [meuId, setMeuId] = useState<string | null>(null)

  const [dialogAberto, setDialogAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState(PAPEIS_STAFF[1])
  const [convidando, setConvidando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState<{ email: string; tempPassword: string } | null>(null)

  const [alterandoId, setAlterandoId] = useState<string | null>(null)

  useEffect(() => {
    loadUsuarios()
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id || null))
  }, [])

  async function loadUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email, ativo, criado_em, usuarios_perfis(perfis(nome))')
      .order('criado_em', { ascending: false })
    if (data) setUsuarios(data as unknown as Usuario[])
    setLoading(false)
  }

  function abrirNovo() {
    setNome('')
    setEmail('')
    setPapel(PAPEIS_STAFF[1])
    setErro('')
    setSucesso(null)
    setDialogAberto(true)
  }

  async function convidar(e: React.FormEvent) {
    e.preventDefault()
    setConvidando(true)
    setErro('')
    setSucesso(null)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/convidar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ email, nome, papel }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json.error || 'Erro ao criar usuário')
      setConvidando(false)
      return
    }

    setSucesso({ email: json.email, tempPassword: json.tempPassword })
    setConvidando(false)
    await loadUsuarios()
  }

  async function alternarAtivo(u: Usuario) {
    setAlterandoId(u.id)
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    await loadUsuarios()
    setAlterandoId(null)
  }

  async function trocarPapel(u: Usuario, novoPapel: string) {
    setAlterandoId(u.id)
    const { data: perfis } = await supabase.from('perfis').select('id, nome').in('nome', PAPEIS_STAFF)
    const idNovo = perfis?.find((p) => p.nome === novoPapel)?.id
    const idsOutros = (perfis || []).filter((p) => p.nome !== novoPapel).map((p) => p.id)

    if (idsOutros.length > 0) {
      await supabase.from('usuarios_perfis').delete().eq('usuario_id', u.id).in('perfil_id', idsOutros)
    }
    if (idNovo) {
      await supabase.from('usuarios_perfis').upsert({ usuario_id: u.id, perfil_id: idNovo }, { onConflict: 'usuario_id,perfil_id' })
    }
    await loadUsuarios()
    setAlterandoId(null)
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger
            render={
              <Button onClick={abrirNovo}>
                + Novo Usuário
              </Button>
            }
          />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Usuário</DialogTitle>
            </DialogHeader>

            {sucesso ? (
              <div className="space-y-3">
                <p className="text-green-400 text-sm">
                  Acesso criado pra <strong>{sucesso.email}</strong> — senha temporária:{' '}
                  <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{sucesso.tempPassword}</code>{' '}
                  (repasse e peça pra trocar). Login em{' '}
                  <code className="bg-zinc-800 px-1.5 py-0.5 rounded">/admin/login</code>.
                </p>
                <DialogFooter className="bg-transparent border-zinc-800">
                  <Button type="button" onClick={() => setDialogAberto(false)}>Fechar</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={convidar} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Nome</label>
                  <Input
                    placeholder="Nome completo"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">E-mail</label>
                  <Input
                    type="email"
                    placeholder="nome@legadodigital.com.br"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Papel</label>
                  <select
                    value={papel}
                    onChange={(e) => setPapel(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                  >
                    {PAPEIS_STAFF.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                {erro && <p className="text-red-400 text-sm">{erro}</p>}
                <DialogFooter className="bg-transparent border-zinc-800 mt-4">
                  <Button type="submit" disabled={convidando}>
                    {convidando ? 'Criando...' : 'Criar usuário'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {usuarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum usuário cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Papel</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Criado em</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{u.nome}</td>
                  <td className="py-3 px-4 text-zinc-300">{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      value={papelDe(u) || ''}
                      disabled={alterandoId === u.id}
                      onChange={(e) => trocarPapel(u, e.target.value)}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white"
                    >
                      {!papelDe(u) && <option value="">—</option>}
                      {PAPEIS_STAFF.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    {u.id !== meuId ? (
                      <button
                        type="button"
                        onClick={() => alternarAtivo(u)}
                        disabled={alterandoId === u.id}
                        className="text-xs text-blue-400 hover:underline whitespace-nowrap disabled:opacity-60"
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">você</span>
                    )}
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
