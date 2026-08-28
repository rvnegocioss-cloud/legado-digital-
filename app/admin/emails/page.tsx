'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { linkWhatsApp } from '@/lib/linkWhatsApp'
import { rotuloTipoEmail } from '@/lib/emailLog'

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
  homenagens: { nome_completo: string; parceiro_id: string | null } | null
}

interface MemorialContato {
  id: string
  nome_completo: string
  familia_email: string | null
  familia_telefone: string | null
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

const STATUS_STYLE: Record<string, string> = {
  enviado: 'bg-blue-900/50 text-blue-400',
  confirmado: 'bg-green-900/50 text-green-400',
  erro: 'bg-red-900/50 text-red-400',
}

export default function AdminComunicacoes() {
  const [emails, setEmails] = useState<EmailEnviado[]>([])
  const [carregandoEmails, setCarregandoEmails] = useState(true)
  const [buscaEmail, setBuscaEmail] = useState('')
  const [parceiros, setParceiros] = useState<ParceiroContato[]>([])
  const [loading, setLoading] = useState(true)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [historicoAbertoId, setHistoricoAbertoId] = useState<string | null>(null)

  const carregarEmails = useCallback(async (termo: string) => {
    setCarregandoEmails(true)
    let query = supabase
      .from('emails_enviados')
      .select('*, homenagens(nome_completo, parceiro_id)')
      .order('created_at', { ascending: false })
      .limit(300)

    const termoLimpo = termo.trim()
    if (termoLimpo) {
      query = query.or(`destinatario.ilike.%${termoLimpo}%,assunto.ilike.%${termoLimpo}%`)
    }

    const { data: emailsData } = await query
    setEmails((emailsData as any) || [])
    setCarregandoEmails(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregarEmails(buscaEmail), 300)
    return () => clearTimeout(t)
  }, [buscaEmail, carregarEmails])

  const load = useCallback(async () => {
    setLoading(true)

    const { data: parceirosData } = await supabase
      .from('parceiros_b2b')
      .select('id, nome_fantasia, razao_social, email, telefone')
      .order('razao_social')

    const { data: memoriaisData } = await supabase
      .from('homenagens')
      .select('id, nome_completo, familia_email, familia_telefone, parceiro_id')

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

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Central de Comunicações</h1>
      <p className="text-[var(--tema-zinc-400)] text-sm mb-8">
        Contato de cada parceiro (e-mail e WhatsApp) e o contato oficial da família em cada
        memorial dele, tudo num lugar só — sem precisar abrir e-mail nenhum.
      </p>

      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] divide-y divide-[var(--tema-zinc-800)] mb-10">
        {parceiros.length === 0 ? (
          <p className="text-[var(--tema-zinc-400)] text-sm p-6">Nenhum parceiro cadastrado ainda.</p>
        ) : (
          parceiros.map((p) => {
            const aberto = abertoId === p.id
            return (
              <div key={p.id}>
                <button
                  onClick={() => setAbertoId(aberto ? null : p.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--tema-zinc-800)]/40 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">
                      {p.nome_fantasia || p.razao_social}{' '}
                      <span className="text-[var(--tema-zinc-500)] text-xs font-normal">· {textoAtividade(p.ultimaAtividade)}</span>
                    </p>
                    <p className="text-[var(--tema-zinc-400)] text-xs mt-1 flex items-center gap-2">
                      <span>{p.email || 'sem e-mail cadastrado'}</span>
                      {linkWhatsApp(p.telefone) ? (
                        <a
                          href={linkWhatsApp(p.telefone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                        >
                          <MessageCircle size={12} strokeWidth={1.5} />
                          {p.telefone}
                        </a>
                      ) : (
                        <span>· WhatsApp: sem número cadastrado</span>
                      )}
                    </p>
                  </div>
                  <span className="text-[var(--tema-zinc-500)] text-xs">
                    {p.memoriais.length} memorial{p.memoriais.length === 1 ? '' : 'is'} {aberto ? '▲' : '▼'}
                  </span>
                </button>
                {aberto && (
                  <div className="px-4 pb-4">
                    {p.memoriais.length === 0 ? (
                      <p className="text-[var(--tema-zinc-500)] text-xs">Nenhum memorial deste parceiro ainda.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[var(--tema-zinc-500)] text-xs">
                            <th className="text-left py-2 px-2">Memorial</th>
                            <th className="text-left py-2 px-2">Contato oficial da família</th>
                            <th className="text-left py-2 px-2">WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.memoriais.map((m) => (
                            <tr key={m.id} className="border-t border-[var(--tema-zinc-800)]/50">
                              <td className="py-2 px-2 text-white">{m.nome_completo}</td>
                              <td className="py-2 px-2 text-[var(--tema-zinc-300)]">
                                {m.familia_email || <span className="text-[var(--tema-zinc-600)]">sem e-mail cadastrado</span>}
                              </td>
                              <td className="py-2 px-2">
                                {linkWhatsApp(m.familia_telefone) ? (
                                  <a
                                    href={linkWhatsApp(m.familia_telefone)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                                  >
                                    <MessageCircle size={12} strokeWidth={1.5} />
                                    {m.familia_telefone}
                                  </a>
                                ) : (
                                  <span className="text-[var(--tema-zinc-600)]">sem número</span>
                                )}
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

      <h2 className="text-lg font-medium text-white mb-4">Histórico de e-mails automáticos</h2>

      <input
        type="text"
        value={buscaEmail}
        onChange={(e) => setBuscaEmail(e.target.value)}
        placeholder="Buscar por e-mail ou assunto..."
        className="w-full max-w-md mb-4 px-3 py-2 rounded-lg bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] text-white text-sm placeholder:text-[var(--tema-zinc-500)] focus:outline-none focus:border-[var(--tema-zinc-600)]"
      />

      {emails[0] && !buscaEmail && (
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-3 mb-4 text-sm ${
            emails[0].status === 'erro' ? 'bg-red-900/30 border border-red-800' : 'bg-green-900/30 border border-green-800'
          }`}
        >
          <span className={emails[0].status === 'erro' ? 'text-red-300' : 'text-green-300'}>
            {emails[0].status === 'erro' ? '✕ Último e-mail falhou' : '✓ Último e-mail enviado com sucesso'} —{' '}
            {rotuloTipoEmail(emails[0].tipo)} pra {emails[0].destinatario}
          </span>
          <span className="text-[var(--tema-zinc-400)] text-xs whitespace-nowrap ml-4">
            {new Date(emails[0].created_at).toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {carregandoEmails ? (
        <p className="text-[var(--tema-zinc-400)] text-sm">Buscando...</p>
      ) : emails.length === 0 ? (
        <p className="text-[var(--tema-zinc-400)] text-sm">
          {buscaEmail ? 'Nenhum e-mail encontrado pra essa busca.' : 'Nenhum e-mail disparado ainda.'}
        </p>
      ) : (
        (() => {
          const parceiroPorId = new Map(parceiros.map((p) => [p.id, p]))
          const grupos = new Map<string, { parceiro: ParceiroContato | null; emails: EmailEnviado[] }>()
          for (const e of emails) {
            const parceiroId = e.homenagens?.parceiro_id ?? null
            const chave = parceiroId || 'sem-parceiro'
            if (!grupos.has(chave)) {
              grupos.set(chave, { parceiro: parceiroId ? parceiroPorId.get(parceiroId) || null : null, emails: [] })
            }
            grupos.get(chave)!.emails.push(e)
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
                const aberto = historicoAbertoId === chave
                const nome = grupo.parceiro
                  ? grupo.parceiro.nome_fantasia || grupo.parceiro.razao_social
                  : 'Sem parceiro (cadastrado direto pela Central)'
                return (
                  <div key={chave}>
                    <button
                      onClick={() => setHistoricoAbertoId(aberto ? null : chave)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--tema-zinc-800)]/40 transition-colors"
                    >
                      <span className="text-white font-medium text-sm">{nome}</span>
                      <span className="text-[var(--tema-zinc-500)] text-xs">
                        {grupo.emails.length} e-mail{grupo.emails.length === 1 ? '' : 's'} {aberto ? '▲' : '▼'}
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[var(--tema-zinc-500)] text-xs">
                              <th className="text-left py-2 px-2">Memorial</th>
                              <th className="text-left py-2 px-2">Tipo</th>
                              <th className="text-left py-2 px-2">Destinatário</th>
                              <th className="text-left py-2 px-2">Status</th>
                              <th className="text-left py-2 px-2">Quando</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.emails.map((e) => (
                              <tr key={e.id} className="border-t border-[var(--tema-zinc-800)]/50">
                                <td className="py-2 px-2 text-white">{e.homenagens?.nome_completo || '—'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{rotuloTipoEmail(e.tipo)}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{e.destinatario}</td>
                                <td className="py-2 px-2">
                                  <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLE[e.status] || 'bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-400)]'}`}>
                                    {e.status}
                                  </span>
                                  {e.erro_msg && <p className="text-xs text-[var(--tema-zinc-500)] mt-1">{e.erro_msg}</p>}
                                </td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-400)]">
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
              })}
            </div>
          )
        })()
      )}
    </div>
  )
}
