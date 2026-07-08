'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ScrollText, Users } from 'lucide-react'
import { supabase } from '@/lib/auth'

interface Stats {
  totalParceiros: number
  totalMemoriais: number
  totalUsuarios: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalParceiros: 0,
    totalMemoriais: 0,
    totalUsuarios: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <card.Icon className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
            <h2 className="text-lg font-medium text-zinc-300">{card.title}</h2>
            <p className="text-3xl font-bold text-white mt-2">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
