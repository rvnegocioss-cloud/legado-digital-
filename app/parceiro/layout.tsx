'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getParceiroUser, getAdminUser, signOut, supabase } from '@/lib/auth'
import { useTema } from '@/lib/useTema'
import LegadoBotWidget from '@/components/LegadoBotWidget'
import TrocarSenhaObrigatoria from '@/components/TrocarSenhaObrigatoria'
import { MessageCircle, Sun, Moon } from 'lucide-react'

type ParceiroUser = {
  email: string
  senha_temporaria: boolean
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
  const [semVinculo, setSemVinculo] = useState(false)
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(false)
  const [loading, setLoading] = useState(true)
  const { tema, alternarTema } = useTema()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ?parceiro_id= na URL só existe quando veio do botão "Acessar Plataforma do Parceiro"
        // da Central — checa staff PRIMEIRO. Senão, uma conta que é staff E também tem
        // vínculo próprio em parceiros_usuarios (ex: teste antigo) ficava presa mostrando
        // o próprio parceiro dela em vez do parceiro escolhido na Central.
        if (parceiroIdParam) {
          const adminUser = await getAdminUser()
          if (adminUser) {
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
        }

        const parceiroUser = (await getParceiroUser()) as ParceiroUser | null

        if (parceiroUser) {
          const parceiros = parceiroUser.parceiros_usuarios.map((pu) => pu.parceiros_b2b).filter(Boolean)
          if (parceiros.length === 0) {
            // Papel "Parceiro B2B" atribuído mas sem vínculo em parceiros_usuarios
            // (ex: convite nunca concluído) — nunca deixa passar pras páginas
            // filhas, que assumiriam esse parceiro_id e rodariam consulta sem filtro.
            setEmail(parceiroUser.email)
            setSemVinculo(true)
            setLoading(false)
            return
          }
          setNomeParceiro(parceiros[0]?.nome_fantasia || parceiros[0]?.razao_social || 'Parceiro')
          setEmail(parceiroUser.email)
          setModoStaff(false)
          setPrecisaTrocarSenha(!!parceiroUser.senha_temporaria)
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--tema-zinc-950)]">
        <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
      </div>
    )
  }

  if (!email) return null

  if (semVinculo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tema-zinc-950)] px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-white text-lg font-medium">Sua conta ainda não está vinculada a nenhum parceiro.</p>
          <p className="text-[var(--tema-zinc-400)] text-sm">
            O login <strong>{email}</strong> existe, mas nenhuma funerária/cemitério foi associado a ele ainda.
            Fale com a equipe Legado Digital pra concluir o vínculo.
          </p>
          <button
            onClick={async () => { await signOut(); router.push('/parceiro/login') }}
            className="text-sm text-blue-400 hover:underline"
          >
            Sair e tentar outro login
          </button>
        </div>
      </div>
    )
  }

  if (precisaTrocarSenha) {
    return <TrocarSenhaObrigatoria onConcluido={() => setPrecisaTrocarSenha(false)} />
  }

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
    { href: `/parceiro/cemiterios${suffix}`, label: 'Cemitérios', match: '/parceiro/cemiterios' },
    { href: `/parceiro/emails${suffix}`, label: 'E-mails', match: '/parceiro/emails' },
  ]

  return (
    <div className="min-h-screen bg-[var(--tema-zinc-950)] text-white">
      {modoStaff && (
        <div className="bg-yellow-900/40 text-yellow-300 text-xs text-center py-1.5">
          Visualizando como <strong>{nomeParceiro}</strong> — modo Central
        </div>
      )}
      <nav className="border-b border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)]/50 backdrop-blur-sm">
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
                        ? 'bg-[var(--tema-zinc-800)] text-white'
                        : 'text-[var(--tema-zinc-400)] hover:text-white hover:bg-[var(--tema-zinc-800)]/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new Event('legadobot:abrir'))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--tema-zinc-800)]/50"
                  style={{ color: '#C9A46A' }}
                >
                  <MessageCircle size={16} className="shrink-0" />
                  LegadoBot Chat
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--tema-zinc-400)] hidden sm:inline">{email}</span>
              <button
                onClick={alternarTema}
                className="text-[var(--tema-zinc-400)] hover:text-white transition-colors"
                aria-label={tema === 'escuro' ? 'Mudar pro tema claro' : 'Mudar pro tema escuro'}
                title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
              >
                {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-[var(--tema-zinc-400)] hover:text-white transition-colors"
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
