'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getParceiroUser, signOut } from '@/lib/auth'

type ParceiroUser = {
  email: string
  parceiros_usuarios: { parceiros_b2b: { id: string; nome_fantasia: string | null; razao_social: string } | null }[]
}

export default function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ParceiroUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const parceiroUser = (await getParceiroUser()) as ParceiroUser | null

        if (!parceiroUser && pathname !== '/parceiro/login') {
          router.push('/parceiro/login')
          return
        }
        setUser(parceiroUser)
      } catch {
        router.push('/parceiro/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [pathname, router])

  if (pathname === '/parceiro/login') return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    )
  }

  if (!user) return null

  async function handleLogout() {
    await signOut()
    router.push('/parceiro/login')
  }

  const parceiros = user.parceiros_usuarios.map((pu) => pu.parceiros_b2b).filter(Boolean)
  const nomeParceiro = parceiros[0]?.nome_fantasia || parceiros[0]?.razao_social || 'Parceiro'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/parceiro/memoriais" className="text-lg font-bold text-blue-400">
                {nomeParceiro}
              </Link>
              <span className="text-xs uppercase tracking-wide text-zinc-500">Portal do Parceiro</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
