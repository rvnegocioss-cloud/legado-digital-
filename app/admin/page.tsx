'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ScrollText, Users } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SecaoRetratil from '@/components/admin/SecaoRetratil'

interface Stats {
  totalParceiros: number
  totalMemoriais: number
  totalUsuarios: number
}

interface MemorialQr {
  id: string
  nome_completo: string
  slug: string | null
  qr_code_url: string | null
}

interface RankItem {
  nome: string
  visualizacoes: number
}

interface MemorialIncompleto {
  id: string
  nome_completo: string
  preenchido_por: 'funeraria' | 'familia' | null
  origem_cadastro: string | null
  falta: string[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalParceiros: 0,
    totalMemoriais: 0,
    totalUsuarios: 0,
  })
  const [loading, setLoading] = useState(true)
  const [memoriaisQr, setMemoriaisQr] = useState<MemorialQr[]>([])
  const [emailFornecedor, setEmailFornecedor] = useState('')
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [totalVisualizacoes, setTotalVisualizacoes] = useState(0)
  const [novosMemoriais, setNovosMemoriais] = useState(0)
  const [homenagensRecentes, setHomenagensRecentes] = useState(0)
  const [topCemiterios, setTopCemiterios] = useState<RankItem[]>([])
  const [topParceiros, setTopParceiros] = useState<RankItem[]>([])
  const [incompletos, setIncompletos] = useState<MemorialIncompleto[]>([])

  useEffect(() => {
    loadStats()
    loadMemoriaisQr()
    loadEmailFornecedor()
    loadMetricas()
    loadIncompletos()
  }, [])

  // Memorial cadastrado em campo (botão direito no túmulo, pelo mapa do
  // cemitério) nasce só com o nome -- é o mínimo pra existir. Sem esse
  // alerta ele ficaria pela metade sem ninguém notar.
  async function loadIncompletos() {
    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, data_falecimento, foto_url, biografia, familia_email, preenchido_por, origem_cadastro, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    const lista = (data || [])
      .map((m) => {
        const falta: string[] = []
        if (!m.data_falecimento) falta.push('data de falecimento')
        if (!m.foto_url) falta.push('foto')
        if (!m.biografia) falta.push('história')
        if (!m.familia_email) falta.push('contato da família')
        return { ...m, falta }
      })
      .filter((m) => m.falta.length > 0)

    setIncompletos(lista as MemorialIncompleto[])
  }

  async function loadMetricas() {
    // Agregação inteira no Postgres (RPC) — antes baixava homenagens+lapides+
    // parceiros_b2b inteiras pro navegador só pra somar em JS. Funcionava
    // com poucos registros, virava payload de megabytes em escala.
    const { data: metricas } = await supabase.rpc('admin_dashboard_metricas')
    if (metricas) {
      setTotalVisualizacoes(metricas.totalVisualizacoes || 0)
      setNovosMemoriais(metricas.novosMemoriais || 0)
      setTopCemiterios(metricas.topCemiterios || [])
      setTopParceiros(metricas.topParceiros || [])
    }

    const seteDiasAtras = Date.now() - 7 * 86400000
    const { count: condolenciasRecentes } = await supabase
      .from('condolencias')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(seteDiasAtras).toISOString())
    setHomenagensRecentes(condolenciasRecentes || 0)
  }

  async function loadStats() {
    const { count: totalParceiros } = await supabase
      .from('parceiros_b2b')
      .select('*', { count: 'exact', head: true })

    const { count: totalMemoriais } = await supabase
      .from('homenagens')
      .select('*', { count: 'exact', head: true })

    const { count: totalUsuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })

    setStats({
      totalParceiros: totalParceiros || 0,
      totalMemoriais: totalMemoriais || 0,
      totalUsuarios: totalUsuarios || 0,
    })
    setLoading(false)
  }

  async function loadMemoriaisQr() {
    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, slug, qr_code_url')
      .order('created_at', { ascending: false })
      .limit(20)
    setMemoriaisQr(data || [])
  }

  async function loadEmailFornecedor() {
    const { data } = await supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'email_fornecedor_placas')
      .maybeSingle()
    setEmailFornecedor(data?.valor || '')
  }

  async function salvarEmailFornecedor(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoEmail(true)
    setEmailMsg('')

    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({ valor: emailFornecedor.trim() || null, updated_at: new Date().toISOString() })
      .eq('chave', 'email_fornecedor_placas')

    setEmailMsg(error ? error.message : 'Salvo — próximos QR Codes gerados já vão pra esse e-mail.')
    setSalvandoEmail(false)
  }

  const cards = [
    { title: 'Parceiros B2B', value: stats.totalParceiros, Icon: Building2, href: '/admin/parceiros' },
    { title: 'Memoriais', value: stats.totalMemoriais, Icon: ScrollText, href: '/admin/memoriais' },
    { title: 'Usuários', value: stats.totalUsuarios, Icon: Users, href: '/admin/usuarios' },
  ]

  if (loading) {
    return <p className="text-[var(--dash-fg-muted)]">Carregando...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--dash-fg)] mb-8">Dashboard</h1>

      {incompletos.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 mb-6">
          <h2 className="text-sm font-semibold mb-1" style={{ color: '#fbbf24' }}>
            {incompletos.length} memorial{incompletos.length === 1 ? '' : 'is'} com dados faltando
          </h2>
          <p className="text-xs text-[var(--dash-fg-muted)] mb-3">
            Memorial cadastrado em campo (botão direito no túmulo, pelo mapa do cemitério) nasce só com o nome. Aqui é o que falta em cada um.
          </p>
          <ul className="space-y-1.5">
            {incompletos.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 text-xs flex-wrap">
                <Link href={`/admin/memoriais/${m.id}`} className="font-medium hover:underline" style={{ color: '#C9A46A' }}>
                  {m.nome_completo}
                </Link>
                <span className="text-[var(--dash-fg-muted)] flex-1 min-w-[180px]">
                  falta {m.falta.join(', ')}
                  {m.preenchido_por === 'familia' && <span className="text-blue-400"> · aguardando a família</span>}
                  {m.origem_cadastro === 'mapa_cemiterio' && <span className="text-[var(--dash-fg-muted)]"> · cadastrado no cemitério</span>}
                </span>
              </li>
            ))}
          </ul>
          {incompletos.length > 12 && (
            <p className="text-xs text-[var(--dash-fg-muted)] mt-2">e mais {incompletos.length - 12}...</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-[var(--dash-bg)] border border-[var(--dash-border)] p-3">
          <h2 className="text-xs font-medium text-[var(--dash-fg-muted)]">Visitas nos memoriais</h2>
          <p className="text-xl font-bold text-[var(--dash-fg)] mt-1">{totalVisualizacoes}</p>
          <p className="text-[var(--dash-fg-faint)] text-[11px] mt-0.5">total acumulado desde que o contador entrou no ar</p>
        </div>
        <div className="rounded-lg bg-[var(--dash-bg)] border border-[var(--dash-border)] p-3">
          <h2 className="text-xs font-medium text-[var(--dash-fg-muted)]">Novos memoriais</h2>
          <p className="text-xl font-bold text-[var(--dash-fg)] mt-1">{novosMemoriais}</p>
          <p className="text-[var(--dash-fg-faint)] text-[11px] mt-0.5">nos últimos 7 dias</p>
        </div>
        <div className="rounded-lg bg-[var(--dash-bg)] border border-[var(--dash-border)] p-3">
          <h2 className="text-xs font-medium text-[var(--dash-fg-muted)]">Homenagens recentes</h2>
          <p className="text-xl font-bold text-[var(--dash-fg)] mt-1">{homenagensRecentes}</p>
          <p className="text-[var(--dash-fg-faint)] text-[11px] mt-0.5">condolências deixadas nos últimos 7 dias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-6">
          <h2 className="text-sm font-medium text-[var(--dash-fg-muted)] mb-3">Cemitérios com mais visita</h2>
          {topCemiterios.length === 0 ? (
            <p className="text-[var(--dash-fg-faint)] text-sm">Sem memorial vinculado a lápide/cemitério ainda.</p>
          ) : (
            <ul className="space-y-2">
              {topCemiterios.map((c) => (
                <li key={c.nome} className="flex justify-between text-sm">
                  <span className="text-[var(--dash-fg-muted)]">{c.nome}</span>
                  <span className="text-[var(--dash-fg)] font-medium">{c.visualizacoes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-6">
          <h2 className="text-sm font-medium text-[var(--dash-fg-muted)] mb-3">Parceiros com mais visita</h2>
          {topParceiros.length === 0 ? (
            <p className="text-[var(--dash-fg-faint)] text-sm">Sem memorial vinculado a parceiro ainda.</p>
          ) : (
            <ul className="space-y-2">
              {topParceiros.map((p) => (
                <li key={p.nome} className="flex justify-between text-sm">
                  <span className="text-[var(--dash-fg-muted)]">{p.nome}</span>
                  <span className="text-[var(--dash-fg)] font-medium">{p.visualizacoes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--dash-bg)] border border-[var(--dash-border)] hover:border-[var(--dash-input-border)] transition-colors"
          >
            <card.Icon className="text-[var(--dash-fg-muted)] shrink-0" size={20} strokeWidth={1.5} />
            <h2 className="text-xs font-medium text-[var(--dash-fg-muted)] flex-1">{card.title}</h2>
            <p className="text-lg font-bold text-[var(--dash-fg)]">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-6 mt-8">
        <h2 className="text-sm font-medium text-[var(--dash-fg-muted)] mb-1">E-mail do fornecedor de placas</h2>
        <p className="text-[var(--dash-fg-faint)] text-xs mb-4">
          Toda vez que um QR Code é gerado (memorial criado ou editado), ele é encaminhado automaticamente pra esse e-mail — nome do homenageado, ID do memorial, link da página e o PNG do QR anexado.
        </p>
        <form onSubmit={salvarEmailFornecedor} className="flex gap-3 max-w-md">
          <Input
            type="email"
            placeholder="fornecedor@exemplo.com"
            value={emailFornecedor}
            onChange={(e) => setEmailFornecedor(e.target.value)}
            className="bg-[var(--dash-input-bg)] border-[var(--dash-input-border)] text-[var(--dash-fg)] flex-1"
          />
          <Button type="submit" disabled={salvandoEmail}>
            {salvandoEmail ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
        {emailMsg && <p className="text-xs text-[var(--dash-fg-muted)] mt-2">{emailMsg}</p>}
      </div>

      <div className="rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-6 mt-6">
        <SecaoRetratil titulo="Memoriais e QR Codes">
        {memoriaisQr.length === 0 ? (
          <p className="text-[var(--dash-fg-muted)] text-sm">Nenhum memorial cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--dash-fg-muted)] border-b border-[var(--dash-border)]">
                  <th className="text-left py-2 px-3">QR Code</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3"></th>
                  <th className="text-left py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {memoriaisQr.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--dash-border)] hover:bg-[var(--dash-bg-alt)]">
                    <td className="py-2 px-3">
                      {m.qr_code_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.qr_code_url} alt="" className="w-10 h-10 rounded bg-white p-0.5" />
                      ) : (
                        <span className="text-[var(--dash-fg-faint)] text-xs">Sem QR ainda</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[var(--dash-fg)]">
                      <Link href={`/admin/memoriais/${m.id}`} className="hover:text-blue-400 hover:underline">
                        {m.nome_completo}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      {m.qr_code_url && (
                        <a
                          href={m.qr_code_url}
                          download={`qrcode-${m.slug}.png`}
                          className="text-blue-400 hover:underline text-xs"
                        >
                          Baixar QR Code
                        </a>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {m.slug && (
                        <a href={`/homenagem/${m.slug}`} className="text-[var(--dash-fg-muted)] hover:text-[var(--dash-fg)] text-xs">
                          Ver página
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </SecaoRetratil>
      </div>
    </div>
  )
}
