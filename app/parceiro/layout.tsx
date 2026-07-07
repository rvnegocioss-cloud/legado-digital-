'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getParceiroUser, getAdminUser, signOut, supabase } from '@/lib/auth'

type ParceiroUser = {
  email: string
  parceiros_usuarios: { parceiros_b2b: { id: string; nome_fantasia: string | null; razao_social: string } | null }[]
}

export default function ParceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ParceiroLayoutInner>{children}</ParceiroLayoutInner>
    </Suspense>
  )
}

function ParceiroLayoutInner({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null)
  const [nomeParceiro, setNomeParceiro] = useState('Parceiro')
  const [modoStaff, setModoStaff] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const parceiroUser = (await getParceiroUser()) as ParceiroUser | null

        if (parceiroUser) {
          const parceiros = parceiroUser.parceiros_usuarios.map((pu) => pu.parceiros_b2b).filter(Boolean)
          setNomeParceiro(parceiros[0]?.nome_fantasia || parceiros[0]?.razao_social || 'Parceiro')
          setEmail(parceiroUser.email)
          setModoStaff(false)
          setLoading(false)
          return
        }

        // Não tem papel de parceiro — se for equipe da Central visualizando um parceiro específico, libera
        const adminUser = await getAdminUser()
        if (adminUser && parceiroIdParam) {
          const { data } = await supabase
            .from('parceiros_b2b')
            .select('nome_fantasia, razao_social')
            .eq('id', parceiroIdParam)
            .single()
          setNomeParceiro(data?.nome_fantasia || data?.razao_social || 'Parceiro')
          setEmail(adminUser.email)
          setModoStaff(true)
          setLoading(false)
          return
        }

        if (pathname !== '/parceiro/login') {
          router.push('/parceiro/login')
          return
        }
        setLoading(false)
      } catch {
        router.push('/parceiro/login')
      }
    }
    checkAuth()
  }, [pathname, router, parceiroIdParam])

  if (pathname === '/parceiro/login') return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    )
  }

  if (!email) return null

  async function handleLogout() {
    if (modoStaff) {
      router.push(`/admin/parceiros/${parceiroIdParam}`)
      return
    }
    await signOut()
    router.push('/parceiro/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {modoStaff && (
        <div className="bg-yellow-900/40 text-yellow-300 text-xs text-center py-1.5">
          Visualizando como <strong>{nomeParceiro}</strong> — modo Central
        </div>
      )}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link
                href={modoStaff ? `/parceiro/memoriais?parceiro_id=${parceiroIdParam}` : '/parceiro/memoriais'}
                className="text-lg font-bold text-blue-400"
              >
                {nomeParceiro}
              </Link>
              <span className="text-xs uppercase tracking-wide text-zinc-500">Portal do Parceiro</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">{email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {modoStaff ? 'Voltar pra Central' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
