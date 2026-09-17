'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

interface RankItem {
  id: string
  nome: string
  visualizacoes: number
}

// Dashboard enxuto (2026-09-17, Opção 2 do wireframe wireframe/1709-dashboard
// aprovada pelo Rafael): só números e os rankings de visita, tudo visível sem
// clicar. O que saiu daqui: memoriais com dados faltando e e-mail do
// fornecedor de placas (foram pra Central de Comunicações) e a tabela de QR
// Codes (virou coluna na lista de Memoriais).
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [totalParceiros, setTotalParceiros] = useState(0)
  const [totalMemoriais, setTotalMemoriais] = useState(0)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalVisualizacoes, setTotalVisualizacoes] = useState(0)
  const [novosMemoriais, setNovosMemoriais] = useState(0)
  const [homenagensRecentes, setHomenagensRecentes] = useState(0)
  const [topCemiterios, setTopCemiterios] = useState<RankItem[]>([])
  const [topParceiros, setTopParceiros] = useState<RankItem[]>([])

  useEffect(() => {
    async function carregar() {
      const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString()
      // Agregação de visitas inteira no Postgres (RPC) -- nunca baixar as
      // tabelas pro navegador só pra somar.
      const [{ data: metricas }, parceiros, memoriais, usuarios, condolencias] = await Promise.all([
        supabase.rpc('admin_dashboard_metricas'),
        supabase.from('parceiros_b2b').select('*', { count: 'exact', head: true }),
        // rascunho ("Novo memorial") não é memorial de verdade
        supabase.from('homenagens').select('*', { count: 'exact', head: true }).not('slug', 'like', 'rascunho-%').neq('nome_completo', 'Novo memorial'),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('condolencias').select('*', { count: 'exact', head: true }).gte('created_at', seteDiasAtras),
      ])
      if (metricas) {
        setTotalVisualizacoes(metricas.totalVisualizacoes || 0)
        setNovosMemoriais(metricas.novosMemoriais || 0)
        setTopCemiterios(metricas.topCemiterios || [])
        setTopParceiros(metricas.topParceiros || [])
      }
      setTotalParceiros(parceiros.count || 0)
      setTotalMemoriais(memoriais.count || 0)
      setTotalUsuarios(usuarios.count || 0)
      setHomenagensRecentes(condolencias.count || 0)
      setLoading(false)
    }
    carregar()
  }, [])

  if (loading) {
    return <p className="text-[var(--dash-fg-muted)]">Carregando...</p>
  }

  const numeros: { titulo: string; valor: number; nota: string; href?: string }[] = [
    { titulo: 'Visitas nos memoriais', valor: totalVisualizacoes, nota: 'visitantes únicos por dia, desde 17/09' },
    { titulo: 'Novos memoriais', valor: novosMemoriais, nota: 'últimos 7 dias' },
    { titulo: 'Homenagens', valor: homenagensRecentes, nota: 'últimos 7 dias' },
    { titulo: 'Parceiros', valor: totalParceiros, nota: 'abrir →', href: '/admin/parceiros' },
    { titulo: 'Memoriais', valor: totalMemoriais, nota: 'abrir →', href: '/admin/memoriais' },
    { titulo: 'Usuários', valor: totalUsuarios, nota: 'abrir →', href: '/admin/usuarios' },
  ]

  const classeNumero = 'rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-4 block'

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--dash-fg)] mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {numeros.map((n) => {
          const conteudo = (
            <>
              <p className="text-xs font-medium text-[var(--dash-fg-muted)]">{n.titulo}</p>
              <p className="text-2xl font-bold text-[var(--dash-fg)] mt-1">{n.valor}</p>
              <p className="text-[11px] text-[var(--dash-fg-faint)] mt-0.5">{n.nota}</p>
            </>
          )
          return n.href ? (
            <Link key={n.titulo} href={n.href} className={`${classeNumero} hover:border-[var(--dash-input-border)] transition-colors`}>
              {conteudo}
            </Link>
          ) : (
            <div key={n.titulo} className={classeNumero}>
              {conteudo}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { titulo: 'Visitas por cemitério', itens: topCemiterios, vazio: 'Nenhum cemitério cadastrado ainda.', href: (id: string) => `/admin/cemiterios/${id}/mapa` },
          { titulo: 'Visitas por parceiro', itens: topParceiros, vazio: 'Nenhum parceiro cadastrado ainda.', href: (id: string) => `/admin/parceiros/${id}` },
        ].map((r) => (
          <div key={r.titulo} className="rounded-xl bg-[var(--dash-bg)] border border-[var(--dash-border)] p-5">
            <h2 className="text-sm font-medium text-[var(--dash-fg-muted)] mb-3">{r.titulo}</h2>
            {r.itens.length === 0 ? (
              <p className="text-[var(--dash-fg-faint)] text-sm">{r.vazio}</p>
            ) : (
              <ul className="space-y-2">
                {r.itens.map((i) => (
                  <li key={i.id} className="flex justify-between text-sm">
                    <Link href={r.href(i.id)} className="text-[var(--dash-fg-muted)] hover:text-[var(--dash-fg)] hover:underline">
                      {i.nome}
                    </Link>
                    <span className="text-[var(--dash-fg)] font-medium">{i.visualizacoes}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
