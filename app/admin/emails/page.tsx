'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'

interface EmailEnviado {
  id: string
  homenagem_id: string
  tipo: string
  destinatario: string
  assunto: string
  status: string
  erro_msg: string | null
  confirmado_em: string | null
  created_at: string
  homenagens: { nome_completo: string } | null
}

interface MemorialContato {
  id: string
  nome_completo: string
  familia_email: string | null
}

interface ParceiroContato {
  id: string
  nome_fantasia: string | null
  razao_social: string
  email: string | null
  telefone: string | null
  memoriais: MemorialContato[]
  ultimaAtividade: string | null
}

function textoAtividade(iso: string | null) {
  if (!iso) return 'nunca acessou'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'ativo hoje'
  if (dias === 1) return 'ativo ontem'
  if (dias <= 30) return `ativo há ${dias} dias`
  return `último acesso em ${new Date(iso).toLocaleDateString('pt-BR')}`
}

const TIPO_LABEL: Record<string, string> = {
  senha_familia: 'Senha da família',
  confirmacao_placa: 'Confirmação de placa',
  envio_fornecedor: 'Envio ao fornecedor',
}

const STATUS_STYLE: Record<string, string> = {
  enviado: 'bg-blue-900/50 text-blue-400',
  confirmado: 'bg-green-900/50 text-green-400',
  erro: 'bg-red-900/50 text-red-400',
}

export default function AdminComunicacoes() {
  const [emails, setEmails] = useState<EmailEnviado[]>([])
  const [parceiros, setParceiros] = useState<ParceiroContato[]>([])
  const [loading, setLoading] = useState(true)
  const [abertoId, setAbertoId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    const { data: emailsData } = await supabase
      .from('emails_enviados')
      .select('*, homenagens(nome_completo)')
      .order('created_at', { ascending: false })
      .limit(100)
    setEmails((emailsData as any) || [])

    const { data: parceirosData } = await supabase
      .from('parceiros_b2b')
      .select('id, nome_fantasia, razao_social, email, telefone')
      .order('razao_social')

    const { data: memoriaisData } = await supabase
      .from('homenagens')
      .select('id, nome_completo, familia_email, parceiro_id')

    let ultimaAtividadePorParceiro: Record<string, string | null> = {}
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const res = await fetch('/api/admin/parceiros-atividade', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        ultimaAtividadePorParceiro = json.ultimaAtividadePorParceiro || {}
      }
    }

    const lista: ParceiroContato[] = (parceirosData || []).map((p) => ({
      ...p,
      memoriais: (memoriaisData || []).filter((m) => m.parceiro_id === p.id),
      ultimaAtividade: ultimaAtividadePorParceiro[p.id] || null,
    }))
    setParceiros(lista)

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Central de Comunicações</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Contato de cada parceiro (e-mail e WhatsApp) e o contato oficial da família em cada
        memorial dele, tudo num lugar só — sem precisar abrir e-mail nenhum.
      </p>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800 mb-10">
        {parceiros.length === 0 ? (
          <p className="text-zinc-400 text-sm p-6">Nenhum parceiro cadastrado ainda.</p>
        ) : (
          parceiros.map((p) => {
            const aberto = abertoId === p.id
            return (
              <div key={p.id}>
                <button
                  onClick={() => setAbertoId(aberto ? null : p.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/40 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">
                      {p.nome_fantasia || p.razao_social}{' '}
                      <span className="text-zinc-500 text-xs font-normal">· {textoAtividade(p.ultimaAtividade)}</span>
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">
                      {p.email || 'sem e-mail cadastrado'} · WhatsApp: {p.telefone || 'sem número cadastrado'}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-xs">
                    {p.memoriais.length} memorial{p.memoriais.length === 1 ? '' : 'is'} {aberto ? '▲' : '▼'}
                  </span>
                </button>
                {aberto && (
                  <div className="px-4 pb-4">
                    {p.memoriais.length === 0 ? (
                      <p className="text-zinc-500 text-xs">Nenhum memorial deste parceiro ainda.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-zinc-500 text-xs">
                            <th className="text-left py-2 px-2">Memorial</th>
                            <th className="text-left py-2 px-2">Contato oficial da família</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.memoriais.map((m) => (
                            <tr key={m.id} className="border-t border-zinc-800/50">
                              <td className="py-2 px-2 text-white">{m.nome_completo}</td>
                              <td className="py-2 px-2 text-zinc-300">
                                {m.familia_email || <span className="text-zinc-600">sem e-mail cadastrado</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <h2 className="text-lg font-medium text-white mb-1">Histórico de e-mails automáticos</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Todo e-mail que o sistema disparou — senha da família, confirmação de placa, envio ao
        fornecedor.
      </p>

      {emails.length === 0 ? (
        <p className="text-zinc-400">Nenhum e-mail disparado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Memorial</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Destinatário</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Quando</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{e.homenagens?.nome_completo || '—'}</td>
                  <td className="py-3 px-4 text-zinc-300">{TIPO_LABEL[e.tipo] || e.tipo}</td>
                  <td className="py-3 px-4 text-zinc-300">{e.destinatario}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLE[e.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {e.status}
                    </span>
                    {e.erro_msg && <p className="text-xs text-zinc-500 mt-1">{e.erro_msg}</p>}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(e.confirmado_em || e.created_at).toLocaleString('pt-BR')}
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
