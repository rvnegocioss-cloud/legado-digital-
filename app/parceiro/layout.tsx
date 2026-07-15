'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getParceiroUser, getAdminUser, signOut, supabase } from '@/lib/auth'
import LegadoBotWidget from '@/components/LegadoBotWidget'
import { MessageCircle } from 'lucide-react'

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

  const suffix = modoStaff ? `?parceiro_id=${parceiroIdParam}` : ''
  const navItems = [
    { href: `/parceiro${suffix}`, label: 'Dashboard', match: '/parceiro' },
    { href: `/parceiro/memoriais${suffix}`, label: 'Memoriais (Cadastrar/Editar)', match: '/parceiro/memoriais' },
    { href: `/parceiro/emails${suffix}`, label: 'E-mails', match: '/parceiro/emails' },
  ]

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
              <span className="text-lg font-bold text-blue-400">{nomeParceiro}</span>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === item.match
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new Event('legadobot:abrir'))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-zinc-800/50"
                  style={{ color: '#C9A46A' }}
                >
                  <MessageCircle size={16} className="shrink-0" />
                  LegadoBot Chat
                </button>
              </div>
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
      <LegadoBotWidget />
    </div>
  )
}
