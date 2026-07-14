'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ScrollText, Users } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  useEffect(() => {
    loadStats()
    loadMemoriaisQr()
    loadEmailFornecedor()
    loadMetricas()
  }, [])

  async function loadMetricas() {
    const { data: homenagensData } = await supabase
      .from('homenagens')
      .select('visualizacoes, created_at, parceiro_id, lapide_id')

    const { data: lapidesData } = await supabase.from('lapides').select('id, cemiterio_id')
    const { data: cemiteriosData } = await supabase.from('cemiterios').select('id, nome')
    const { data: parceirosData } = await supabase.from('parceiros_b2b').select('id, nome_fantasia, razao_social')

    const homs = homenagensData || []
    setTotalVisualizacoes(homs.reduce((soma, h) => soma + (h.visualizacoes || 0), 0))

    const seteDiasAtras = Date.now() - 7 * 86400000
    setNovosMemoriais(homs.filter((h) => new Date(h.created_at).getTime() > seteDiasAtras).length)

    const { count: condolenciasRecentes } = await supabase
      .from('condolencias')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(seteDiasAtras).toISOString())
    setHomenagensRecentes(condolenciasRecentes || 0)

    const lapideParaCemiterio = new Map((lapidesData || []).map((l) => [l.id, l.cemiterio_id]))
    const visPorCemiterio = new Map<string, number>()
    for (const h of homs) {
      if (!h.lapide_id) continue
      const cemiterioId = lapideParaCemiterio.get(h.lapide_id)
      if (!cemiterioId) continue
      visPorCemiterio.set(cemiterioId, (visPorCemiterio.get(cemiterioId) || 0) + (h.visualizacoes || 0))
    }
    const nomeCemiterio = new Map((cemiteriosData || []).map((c) => [c.id, c.nome]))
    setTopCemiterios(
      [...visPorCemiterio.entries()]
        .map(([id, visualizacoes]) => ({ nome: nomeCemiterio.get(id) || 'Sem nome', visualizacoes }))
        .sort((a, b) => b.visualizacoes - a.visualizacoes)
        .slice(0, 5)
    )

    const visPorParceiro = new Map<string, number>()
    for (const h of homs) {
      if (!h.parceiro_id) continue
      visPorParceiro.set(h.parceiro_id, (visPorParceiro.get(h.parceiro_id) || 0) + (h.visualizacoes || 0))
    }
    const nomeParceiro = new Map((parceirosData || []).map((p) => [p.id, p.nome_fantasia || p.razao_social]))
    setTopParceiros(
      [...visPorParceiro.entries()]
        .map(([id, visualizacoes]) => ({ nome: nomeParceiro.get(id) || 'Sem nome', visualizacoes }))
        .sort((a, b) => b.visualizacoes - a.visualizacoes)
        .slice(0, 5)
    )
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
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
          <h2 className="text-xs font-medium text-zinc-400">Visitas nos memoriais</h2>
          <p className="text-xl font-bold text-white mt-1">{totalVisualizacoes}</p>
          <p className="text-zinc-500 text-[11px] mt-0.5">total acumulado desde que o contador entrou no ar</p>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
          <h2 className="text-xs font-medium text-zinc-400">Novos memoriais</h2>
          <p className="text-xl font-bold text-white mt-1">{novosMemoriais}</p>
          <p className="text-zinc-500 text-[11px] mt-0.5">nos últimos 7 dias</p>
        </div>
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
          <h2 className="text-xs font-medium text-zinc-400">Homenagens recentes</h2>
          <p className="text-xl font-bold text-white mt-1">{homenagensRecentes}</p>
          <p className="text-zinc-500 text-[11px] mt-0.5">condolências deixadas nos últimos 7 dias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Cemitérios com mais visita</h2>
          {topCemiterios.length === 0 ? (
            <p className="text-zinc-500 text-sm">Sem memorial vinculado a lápide/cemitério ainda.</p>
          ) : (
            <ul className="space-y-2">
              {topCemiterios.map((c) => (
                <li key={c.nome} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{c.nome}</span>
                  <span className="text-white font-medium">{c.visualizacoes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Parceiros com mais visita</h2>
          {topParceiros.length === 0 ? (
            <p className="text-zinc-500 text-sm">Sem memorial vinculado a parceiro ainda.</p>
          ) : (
            <ul className="space-y-2">
              {topParceiros.map((p) => (
                <li key={p.nome} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{p.nome}</span>
                  <span className="text-white font-medium">{p.visualizacoes}</span>
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
            className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <card.Icon className="text-zinc-400 shrink-0" size={20} strokeWidth={1.5} />
            <h2 className="text-xs font-medium text-zinc-400 flex-1">{card.title}</h2>
            <p className="text-lg font-bold text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mt-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-1">E-mail do fornecedor de placas</h2>
        <p className="text-zinc-500 text-xs mb-4">
          Toda vez que um QR Code é gerado (memorial criado ou editado), ele é encaminhado automaticamente pra esse e-mail — nome do homenageado, ID do memorial, link da página e o PNG do QR anexado.
        </p>
        <form onSubmit={salvarEmailFornecedor} className="flex gap-3 max-w-md">
          <Input
            type="email"
            placeholder="fornecedor@exemplo.com"
            value={emailFornecedor}
            onChange={(e) => setEmailFornecedor(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white flex-1"
          />
          <Button type="submit" disabled={salvandoEmail}>
            {salvandoEmail ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
        {emailMsg && <p className="text-xs text-zinc-400 mt-2">{emailMsg}</p>}
      </div>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mt-6">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Memoriais e QR Codes</h2>
        {memoriaisQr.length === 0 ? (
          <p className="text-zinc-400 text-sm">Nenhum memorial cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
                  <th className="text-left py-2 px-3">QR Code</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3"></th>
                  <th className="text-left py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {memoriaisQr.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-2 px-3">
                      {m.qr_code_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.qr_code_url} alt="" className="w-10 h-10 rounded bg-white p-0.5" />
                      ) : (
                        <span className="text-zinc-600 text-xs">Sem QR ainda</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-white">
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
                        <a href={`/homenagem/${m.slug}`} className="text-zinc-400 hover:text-white text-xs">
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
      </div>
    </div>
  )
}
