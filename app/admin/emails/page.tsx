'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { linkWhatsApp } from '@/lib/linkWhatsApp'
import { rotuloTipoEmail } from '@/lib/emailLog'
import PainelLeads from '@/components/admin/PainelLeads'
import PendenciasMemoriais from '@/components/admin/PendenciasMemoriais'
import EmailFornecedorPlacas from '@/components/admin/EmailFornecedorPlacas'
import VisaoGeralComunicacoes, {
  type AbaComunicacoes,
  type AtividadeEmail,
  type ItemFila,
} from '@/components/admin/VisaoGeralComunicacoes'
import { carregarPendencias, type MemorialPendente } from '@/lib/pendenciasMemorial'

interface EmailEnviado {
  id: string
  homenagem_id: string
  tipo: string
  destinatario: string
  assunto: string
  status: string
  erro_msg: string | null
  resolvido_em: string | null
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

const ABAS: { id: AbaComunicacoes; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'pendencias', rotulo: 'Pendências dos memoriais' },
  { id: 'emails', rotulo: 'E-mails enviados' },
  { id: 'contatos', rotulo: 'Contatos e leads' },
  { id: 'fornecedor', rotulo: 'Fornecedor de placas' },
]

const ABA_IDS = ABAS.map((a) => a.id)

export default function AdminComunicacoes() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <ComunicacoesInner />
    </Suspense>
  )
}

function ComunicacoesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const abaParam = searchParams.get('aba') as AbaComunicacoes | null
  const aba: AbaComunicacoes = abaParam && ABA_IDS.includes(abaParam) ? abaParam : 'geral'
  const rotuloAba = ABAS.find((a) => a.id === aba)!.rotulo

  function irPara(id: AbaComunicacoes) {
    router.replace(id === 'geral' ? '/admin/emails' : `/admin/emails?aba=${id}`, { scroll: false })
  }

  const [perguntaAjuda, setPerguntaAjuda] = useState('')
  function perguntarAoBot() {
    const pergunta = perguntaAjuda.trim()
    if (!pergunta) return
    window.dispatchEvent(
      new CustomEvent('legadobot:abrir', {
        detail: { pergunta, contexto: `Central de Comunicações — aba "${rotuloAba}"` },
      })
    )
    setPerguntaAjuda('')
  }

  const [pendencias, setPendencias] = useState<MemorialPendente[]>([])
  const [carregandoPendencias, setCarregandoPendencias] = useState(true)
  const [totalErros, setTotalErros] = useState<number | null>(null)
  const [totalLeadsNovos, setTotalLeadsNovos] = useState<number | null>(null)
  const [fila, setFila] = useState<ItemFila[]>([])
  const [atividade, setAtividade] = useState<AtividadeEmail[]>([])
  const [emails, setEmails] = useState<EmailEnviado[]>([])
  const [carregandoEmails, setCarregandoEmails] = useState(true)
  const [buscaEmail, setBuscaEmail] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'resolvidos'>('todos')
  const [resolvendoId, setResolvendoId] = useState<string | null>(null)
  const [erroResolver, setErroResolver] = useState<string | null>(null)
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

  async function marcarResolvido(id: string, resolvido: boolean) {
    setResolvendoId(id)
    setErroResolver(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setErroResolver('Sessão expirada. Entre de novo.')
      setResolvendoId(null)
      return
    }
    const res = await fetch('/api/admin/email-resolvido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, resolvido }),
    })
    if (res.ok) {
      const json = await res.json()
      setEmails((lista) => lista.map((e) => (e.id === id ? { ...e, resolvido_em: json.resolvido_em ?? null } : e)))
      setErroEmails((lista) => (resolvido ? lista.filter((e) => e.id !== id) : lista))
      setTotalErros((n) => (n === null ? n : Math.max(0, n + (resolvido ? -1 : 1))))
    } else {
      setErroResolver('Não foi possível atualizar este e-mail. Tente de novo.')
    }
    setResolvendoId(null)
  }

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

  useEffect(() => {
    carregarPendencias().then((lista) => {
      setPendencias(lista)
      setCarregandoPendencias(false)
    })
  }, [])

  // Números reais e fila de hoje. Recarrega ao trocar de aba: quem muda o
  // status de um lead (aba Contatos) volta e já vê o número certo.
  const [erroEmails, setErroEmails] = useState<any[]>([])
  const [leadsNovosLista, setLeadsNovosLista] = useState<any[]>([])
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [cErr, cLeads, errosRecentes, leadsRecentes, ultimos] = await Promise.all([
        supabase.from('emails_enviados').select('id', { count: 'exact', head: true }).eq('status', 'erro').is('resolvido_em', null),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('lido', false),
        supabase
          .from('emails_enviados')
          .select('id, tipo, destinatario, erro_msg, created_at, homenagens(nome_completo)')
          .eq('status', 'erro')
          .is('resolvido_em', null)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('leads')
          .select('id, nome, empresa, mensagem, tipo, created_at')
          .eq('lido', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('emails_enviados')
          .select('id, tipo, status, resolvido_em, created_at, homenagens(nome_completo)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (!vivo) return
      setTotalErros(cErr.count ?? 0)
      setTotalLeadsNovos(cLeads.count ?? 0)
      setErroEmails((errosRecentes.data as any[]) || [])
      setLeadsNovosLista((leadsRecentes.data as any[]) || [])
      setAtividade(
        ((ultimos.data as any[]) || []).map((e) => ({
          id: e.id,
          tipo: e.tipo,
          status: e.status === 'erro' && e.resolvido_em ? 'resolvido' : e.status,
          created_at: e.created_at,
          memorial: e.homenagens?.nome_completo ?? null,
        }))
      )
    })()
    return () => {
      vivo = false
    }
  }, [aba])

  useEffect(() => {
    const itens: ItemFila[] = [
      ...erroEmails.map((e): ItemFila => ({
        chave: `erro-${e.id}`,
        tipo: 'erro',
        titulo: `${rotuloTipoEmail(e.tipo)}${e.homenagens?.nome_completo ? ` · ${e.homenagens.nome_completo}` : ''}`,
        meta: e.erro_msg || `para ${e.destinatario}`,
        aba: 'emails',
      })),
      ...leadsNovosLista.map((l): ItemFila => ({
        chave: `lead-${l.id}`,
        tipo: 'lead',
        titulo: `${l.nome}${l.empresa ? ` · ${l.empresa}` : ''}`,
        meta: l.mensagem || (l.tipo === 'parceiro' ? 'Lead de parceiro' : 'Lead de família'),
        aba: 'contatos',
      })),
      ...pendencias
        .filter((m) => m.dias > 14)
        .sort((a, b) => b.dias - a.dias)
        .map((m): ItemFila => ({
          chave: `pend-${m.id}`,
          tipo: 'pendencia',
          titulo: m.nome_completo,
          meta: `sem ${m.falta.join(', ')} há ${m.dias} dias`,
          aba: 'pendencias',
        })),
    ]
    setFila(itens.slice(0, 5))
  }, [erroEmails, leadsNovosLista, pendencias])

  const nomeParceiro = useMemo(
    () => Object.fromEntries(parceiros.map((p) => [p.id, p.nome_fantasia || p.razao_social])),
    [parceiros]
  )

  const emailsFiltrados = useMemo(() => {
    if (filtroStatus === 'pendentes') return emails.filter((e) => e.status === 'erro' && !e.resolvido_em)
    if (filtroStatus === 'resolvidos') return emails.filter((e) => e.status === 'erro' && !!e.resolvido_em)
    return emails
  }, [emails, filtroStatus])

  const badges: Partial<Record<AbaComunicacoes, { n: number; vermelho: boolean }>> = {
    geral: { n: (totalErros ?? 0) + (totalLeadsNovos ?? 0), vermelho: true },
    pendencias: { n: pendencias.length, vermelho: false },
    emails: { n: totalErros ?? 0, vermelho: true },
    contatos: { n: totalLeadsNovos ?? 0, vermelho: false },
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-[var(--tema-zinc-400)] hover:text-white">
        <ArrowLeft size={14} strokeWidth={1.5} />
        Voltar pro Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Central de Comunicações</h1>
          <p className="text-[var(--tema-zinc-400)] text-sm">
            O que exige uma ação sua hoje: dado faltando, e-mails que falharam, leads esperando
            resposta e o contato com parceiros e famílias.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href="/admin/parceiros"
            className="text-sm rounded-lg px-3 py-1.5 border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] text-white hover:border-[#C9A46A]"
          >
            Ir para Parceiros
          </Link>
          <Link href="/admin/memoriais" className="text-sm rounded-lg px-3 py-1.5 bg-blue-600 text-branco-fixo hover:bg-blue-500">
            Ver Memoriais
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-1 flex-wrap border-b border-[var(--tema-zinc-800)] mt-6 mb-6 -mx-1">
        {ABAS.map(({ id, rotulo }) => {
          const badge = badges[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => irPara(id)}
              className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                aba === id
                  ? 'border-[#C9A46A] text-white font-medium'
                  : 'border-transparent text-[var(--tema-zinc-400)] hover:text-white'
              }`}
            >
              {rotulo}
              {badge && badge.n > 0 && (
                <span
                  className={`text-[11px] font-semibold px-1.5 rounded-full ${badge.vermelho ? 'bg-red-600 text-branco-fixo' : ''}`}
                  style={badge.vermelho ? undefined : { background: 'rgba(201,164,106,.2)', color: '#C9A46A' }}
                >
                  {badge.n}
                </span>
              )}
            </button>
          )
        })}
        <button
          type="button"
          disabled
          title="Depende da integração com o Google"
          className="px-3 py-2.5 text-sm whitespace-nowrap border-b-2 border-transparent -mb-px text-[var(--tema-zinc-400)] opacity-50 cursor-not-allowed"
        >
          Caixa contato@ (em breve)
        </button>
      </nav>

      <p className="text-xs text-[var(--tema-zinc-400)] mb-3">
        Você está em:{' '}
        <button
          type="button"
          onClick={() => irPara('geral')}
          className="underline hover:text-white"
          style={{ color: '#C9A46A' }}
        >
          Comunicações
        </button>
        {aba !== 'geral' && ` › ${rotuloAba}`}
      </p>

      <div className="mb-4 pb-3 border-b border-[var(--tema-zinc-800)]">
        <label htmlFor="ajuda-legadobot" className="block text-xs font-semibold mb-1" style={{ color: '#C9A46A' }}>
          LegadoBot — ajuda
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            perguntarAoBot()
          }}
          className="flex gap-1.5 max-w-xl"
        >
          <input
            id="ajuda-legadobot"
            value={perguntaAjuda}
            onChange={(e) => setPerguntaAjuda(e.target.value)}
            placeholder="Pergunte aqui. Ex.: como reenvio a senha da família?"
            autoComplete="off"
            className="flex-1 min-w-0 text-xs bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-2 py-1.5 text-white placeholder-[var(--tema-zinc-500)]"
          />
          <button
            type="submit"
            disabled={!perguntaAjuda.trim()}
            className="shrink-0 text-xs px-3 py-1.5 rounded bg-amber-600 text-branco-fixo hover:bg-amber-500 disabled:opacity-40"
          >
            Perguntar
          </button>
        </form>
      </div>

      {aba === 'geral' && (
        <VisaoGeralComunicacoes
          erros={totalErros}
          pendencias={carregandoPendencias ? null : pendencias.length}
          leadsNovos={totalLeadsNovos}
          fila={fila}
          atividade={atividade}
          onIr={irPara}
        />
      )}

      {aba === 'pendencias' && (
        <PendenciasMemoriais pendencias={pendencias} carregando={carregandoPendencias} nomeParceiro={nomeParceiro} />
      )}

      {aba === 'contatos' && (
        <>
      <PainelLeads tipo="parceiro" />
      <PainelLeads tipo="familia" />

      <h2 className="text-lg font-medium text-white mb-4">Parceiros e contatos das famílias</h2>

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
        </>
      )}

      {aba === 'fornecedor' && <EmailFornecedorPlacas />}

      {aba === 'emails' && (
        <>
      <h2 className="text-lg font-medium text-white mb-4">Histórico de e-mails automáticos</h2>

      <input
        type="text"
        value={buscaEmail}
        onChange={(e) => setBuscaEmail(e.target.value)}
        placeholder="Buscar por e-mail ou assunto..."
        className="w-full max-w-md mb-4 px-3 py-2 rounded-lg bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] text-white text-sm placeholder:text-[var(--tema-zinc-500)] focus:outline-none focus:border-[var(--tema-zinc-600)]"
      />

      <div className="mb-4">
        <label htmlFor="filtro-status-email" className="block text-xs text-[var(--tema-zinc-400)] mb-1">
          Mostrar
        </label>
        <select
          id="filtro-status-email"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as 'todos' | 'pendentes' | 'resolvidos')}
          className="px-3 py-2 rounded-lg bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] text-white text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendentes">Erros pendentes</option>
          <option value="resolvidos">Resolvidos</option>
        </select>
      </div>

      {erroResolver && <p className="text-xs text-red-400 mb-3">{erroResolver}</p>}

      {emails[0] && !buscaEmail && filtroStatus === 'todos' && (
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-3 mb-4 text-sm ${
            emails[0].status === 'erro' && !emails[0].resolvido_em ? 'bg-red-900/30 border border-red-800' : 'bg-green-900/30 border border-green-800'
          }`}
        >
          <span className={emails[0].status === 'erro' && !emails[0].resolvido_em ? 'text-red-300' : 'text-green-300'}>
            {emails[0].status === 'erro'
              ? emails[0].resolvido_em
                ? '✓ Último e-mail falhou, já resolvido'
                : '✕ Último e-mail falhou'
              : '✓ Último e-mail enviado com sucesso'} —{' '}
            {rotuloTipoEmail(emails[0].tipo)} pra {emails[0].destinatario}
          </span>
          <span className="text-[var(--tema-zinc-400)] text-xs whitespace-nowrap ml-4">
            {new Date(emails[0].created_at).toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {carregandoEmails ? (
        <p className="text-[var(--tema-zinc-400)] text-sm">Buscando...</p>
      ) : emailsFiltrados.length === 0 ? (
        <p className="text-[var(--tema-zinc-400)] text-sm">
          {buscaEmail || filtroStatus !== 'todos'
            ? 'Nenhum e-mail encontrado pra esse filtro.'
            : 'Nenhum e-mail disparado ainda.'}
        </p>
      ) : (
        (() => {
          const parceiroPorId = new Map(parceiros.map((p) => [p.id, p]))
          const grupos = new Map<string, { parceiro: ParceiroContato | null; emails: EmailEnviado[] }>()
          for (const e of emailsFiltrados) {
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
                                  {e.status === 'erro' && !e.resolvido_em && (
                                    <button
                                      type="button"
                                      disabled={resolvendoId === e.id}
                                      onClick={() => marcarResolvido(e.id, true)}
                                      className="mt-1.5 inline-flex items-center gap-1 text-xs rounded-lg px-2 py-1 border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] text-white hover:border-[#C9A46A] disabled:opacity-40"
                                    >
                                      <Check size={12} strokeWidth={1.5} />
                                      Marcar como resolvido
                                    </button>
                                  )}
                                  {e.status === 'erro' && e.resolvido_em && (
                                    <p className="text-xs text-[var(--tema-zinc-500)] mt-1">
                                      Resolvido em{' '}
                                      {new Date(e.resolvido_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      {' · '}
                                      <button
                                        type="button"
                                        disabled={resolvendoId === e.id}
                                        onClick={() => marcarResolvido(e.id, false)}
                                        className="underline hover:text-white disabled:opacity-40"
                                      >
                                        Desfazer
                                      </button>
                                    </p>
                                  )}
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
        </>
      )}
    </div>
  )
}
