'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

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
  plano_contratado: string | null
  status_pagamento: string
  created_at: string
}

interface Memorial {
  id: string
  nome_completo: string
  cidade: string | null
  created_at: string
}

const TIPO_LABEL: Record<string, string> = {
  funeraria: 'Funerária',
  plano_funerario: 'Plano Funerário',
  prefeitura: 'Prefeitura',
  autarquia: 'Autarquia',
  concessionaria: 'Concessionária',
  associacao: 'Associação',
  entidade_religiosa: 'Entidade Religiosa',
  canal_comercial: 'Canal Comercial',
}

const PAGAMENTO_LABEL: Record<string, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-green-900/50 text-green-400' },
  pendente: { label: 'Pendente', className: 'bg-yellow-900/50 text-yellow-400' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-900/50 text-red-400' },
}

export default function DetalheParceiro() {
  const params = useParams<{ id: string }>()
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)
  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [loading, setLoading] = useState(true)

  const [conviteEmail, setConviteEmail] = useState('')
  const [conviteNome, setConviteNome] = useState('')
  const [convidando, setConvidando] = useState(false)
  const [conviteErro, setConviteErro] = useState('')
  const [conviteSucesso, setConviteSucesso] = useState<{ email: string; tempPassword: string } | null>(null)

  useEffect(() => {
    if (params.id) load(params.id)
  }, [params.id])

  async function convidarContato(e: React.FormEvent) {
    e.preventDefault()
    setConvidando(true)
    setConviteErro('')
    setConviteSucesso(null)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/convidar-parceiro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ parceiroId: params.id, email: conviteEmail, nome: conviteNome }),
    })
    const json = await res.json()

    if (!res.ok) {
      setConviteErro(json.error || 'Erro ao convidar contato')
    } else {
      setConviteSucesso({ email: json.email, tempPassword: json.tempPassword })
      setConviteEmail('')
      setConviteNome('')
    }
    setConvidando(false)
  }

  async function load(id: string) {
    setLoading(true)
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('parceiros_b2b').select('*').eq('id', id).single(),
      supabase
        .from('homenagens')
        .select('id, nome_completo, cidade, created_at')
        .eq('parceiro_id', id)
        .order('created_at', { ascending: false }),
    ])
    setParceiro(p)
    setMemoriais(m || [])
    setLoading(false)
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>
  if (!parceiro) return <p className="text-zinc-400">Parceiro não encontrado.</p>

  const pagamento = PAGAMENTO_LABEL[parceiro.status_pagamento] || PAGAMENTO_LABEL.em_dia

  return (
    <div>
      <Link href="/admin/parceiros" className="text-sm text-zinc-400 hover:text-white">
        ← Voltar pra Parceiros
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {parceiro.nome_fantasia || parceiro.razao_social}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {TIPO_LABEL[parceiro.tipo_parceiro] || parceiro.tipo_parceiro}
            {parceiro.cidade && ` · ${parceiro.cidade}${parceiro.estado ? '/' + parceiro.estado : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/parceiro/memoriais?parceiro_id=${parceiro.id}`}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap"
          >
            Acessar Plataforma do Parceiro
          </Link>
          <span
            className={`px-2 py-1 rounded text-xs ${
              parceiro.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}
          >
            {parceiro.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Dados cadastrais</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Razão social</dt>
              <dd className="text-white">{parceiro.razao_social}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">CNPJ</dt>
              <dd className="text-white">{parceiro.cnpj || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">E-mail</dt>
              <dd className="text-white">{parceiro.email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Telefone</dt>
              <dd className="text-white">{parceiro.telefone || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Plano e pagamento</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Plano contratado</dt>
              <dd className="text-white">{parceiro.plano_contratado || '—'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-zinc-500">Status de pagamento</dt>
              <dd>
                <span className={`px-2 py-0.5 rounded text-xs ${pagamento.className}`}>
                  {pagamento.label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Parceiro desde</dt>
              <dd className="text-white">
                {new Date(parceiro.created_at).toLocaleDateString('pt-BR')}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Acesso ao Portal do Parceiro</h2>
        <p className="text-zinc-500 text-sm mb-4">
          Cria (ou atualiza) o login desse contato pro Portal do Parceiro, com senha temporária.
        </p>
        <form onSubmit={convidarContato} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Nome do contato"
            value={conviteNome}
            onChange={(e) => setConviteNome(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500"
          />
          <input
            type="email"
            placeholder="E-mail do contato"
            required
            value={conviteEmail}
            onChange={(e) => setConviteEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500"
          />
          <button
            type="submit"
            disabled={convidando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg whitespace-nowrap"
          >
            {convidando ? 'Criando...' : 'Convidar contato'}
          </button>
        </form>
        {conviteErro && <p className="text-red-400 text-sm mt-3">{conviteErro}</p>}
        {conviteSucesso && (
          <p className="text-green-400 text-sm mt-3">
            Acesso criado pra <strong>{conviteSucesso.email}</strong> — senha temporária:{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{conviteSucesso.tempPassword}</code>{' '}
            (repasse pro parceiro e peça pra trocar). Login em{' '}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded">/parceiro/login</code>.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">
          Memoriais {memoriais.length > 0 && `(${memoriais.length})`}
        </h2>
        {memoriais.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhum memorial cadastrado por este parceiro ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-2">Nome</th>
                <th className="text-left py-2">Cidade</th>
                <th className="text-left py-2">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50">
                  <td className="py-2 text-white">{m.nome_completo}</td>
                  <td className="py-2 text-zinc-300">{m.cidade || '-'}</td>
                  <td className="py-2 text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
