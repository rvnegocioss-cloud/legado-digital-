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

  useEffect(() => {
    loadStats()
    loadMemoriaisQr()
    loadEmailFornecedor()
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
