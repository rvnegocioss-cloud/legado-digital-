'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getParceiroUser, getAdminUser, signOut, supabase } from '@/lib/auth'
import { useTema } from '@/lib/useTema'
import LegadoBotWidget from '@/components/LegadoBotWidget'
import TrocarSenhaObrigatoria from '@/components/TrocarSenhaObrigatoria'
import { Home, MessageCircle, Sun, Moon, LayoutDashboard, ScrollText, MapPin, Mail, ChevronLeft, ChevronRight } from 'lucide-react'

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
  const [sidebarAberta, setSidebarAberta] = useState(true)
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
    { href: `/parceiro${suffix}`, label: 'Dashboard', match: '/parceiro', Icon: LayoutDashboard },
    { href: `/parceiro/memoriais${suffix}`, label: 'Memoriais (Cadastrar/Editar)', match: '/parceiro/memoriais', Icon: ScrollText },
    { href: `/parceiro/cemiterios${suffix}`, label: 'Cemitérios', match: '/parceiro/cemiterios', Icon: MapPin },
    { href: `/parceiro/emails${suffix}`, label: 'E-mails', match: '/parceiro/emails', Icon: Mail },
  ]
  const itemAtivo = (match: string) => (match === '/parceiro' ? pathname === match : pathname.startsWith(match))

  // Menu lateral retrátil, mesmo padrão da Central (2026-09-16). Antes era um
  // menu no topo que não cabia na largura e quebrava texto palavra por palavra
  // ("E-" / "mails", "Voltar pra Central" em 3 linhas), e no celular sumia.
  return (
    <div className="min-h-screen bg-[var(--tema-zinc-950)] text-white flex">
      <aside className={`hidden md:flex md:flex-col shrink-0 border-r border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)]/60 transition-all duration-200 ${sidebarAberta ? 'w-60' : 'w-16'}`}>
        <div className="flex items-center h-20 px-3 border-b border-[var(--tema-zinc-800)] shrink-0 justify-between">
          <Link href={`/parceiro${suffix}`} className={`flex items-center overflow-hidden ${sidebarAberta ? '' : 'w-0'}`}>
            <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={240} height={96} className="h-16 w-auto object-contain shrink-0" priority />
          </Link>
          <button
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="shrink-0 p-1.5 rounded-lg text-[var(--tema-zinc-400)] hover:text-white hover:bg-[var(--tema-zinc-800)] transition-colors"
            aria-label={sidebarAberta ? 'Recolher menu' : 'Expandir menu'}
            title={sidebarAberta ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarAberta ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        {sidebarAberta && (
          <p className="px-6 pt-4 text-sm font-semibold text-blue-400 truncate" title={nomeParceiro}>
            {nomeParceiro}
          </p>
        )}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarAberta ? undefined : item.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                itemAtivo(item.match)
                  ? 'bg-[var(--tema-zinc-800)] text-white'
                  : 'text-[var(--tema-zinc-400)] hover:text-white hover:bg-[var(--tema-zinc-800)]/50'
              }`}
            >
              <item.Icon size={16} className="shrink-0" />
              {sidebarAberta && item.label}
            </Link>
          ))}
          <Link
            href="/"
            title={sidebarAberta ? undefined : 'Voltar pro Site'}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-[var(--tema-zinc-400)] hover:text-white hover:bg-[var(--tema-zinc-800)]/50"
          >
            <Home size={16} className="shrink-0" />
            {sidebarAberta && 'Voltar pro Site'}
          </Link>
          <button
            onClick={() => window.dispatchEvent(new Event('legadobot:abrir'))}
            title={sidebarAberta ? undefined : 'LegadoBot Chat'}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--tema-zinc-800)]/50"
            style={{ color: '#C9A46A' }}
          >
            <MessageCircle size={16} className="shrink-0" />
            {sidebarAberta && 'LegadoBot Chat'}
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {modoStaff && (
          <div className="bg-yellow-900/40 text-yellow-300 text-xs text-center py-1.5">
            Visualizando como <strong>{nomeParceiro}</strong> — modo Central
          </div>
        )}
        <header className="h-16 border-b border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)]/50 backdrop-blur-sm flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="md:hidden flex items-center gap-3 min-w-0">
            <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={64} className="h-10 w-auto object-contain shrink-0" />
            <span className="text-sm font-semibold text-blue-400 truncate">{nomeParceiro}</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm whitespace-nowrap text-[var(--tema-zinc-400)] hover:text-white transition-colors"
              aria-label="Voltar pro site"
              title="Voltar pro site"
            >
              <Home size={18} className="shrink-0" />
              <span className="hidden sm:inline">Voltar pro site</span>
            </Link>
            {/* Quem está logado, no mesmo padrão da Central: inicial num
                círculo (sempre visível, inclusive no celular) + e-mail. */}
            <span className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)] min-w-0">
              <span
                className="w-7 h-7 rounded-full bg-[var(--tema-zinc-800)] flex items-center justify-center text-xs shrink-0"
                style={{ color: '#C9A46A' }}
                title={email || ''}
              >
                {(email || '?').charAt(0).toUpperCase()}
              </span>
              <span className="hidden lg:inline truncate max-w-[240px]">{email}</span>
            </span>
            <button
              onClick={alternarTema}
              className="text-[var(--tema-zinc-400)] hover:text-white transition-colors shrink-0"
              aria-label={tema === 'escuro' ? 'Mudar pro tema claro' : 'Mudar pro tema escuro'}
              title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
            >
              {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm whitespace-nowrap text-[var(--tema-zinc-400)] hover:text-white transition-colors"
            >
              {modoStaff ? 'Voltar pra Central' : 'Sair'}
            </button>
          </div>
        </header>

        {/* Celular: o menu lateral não cabe, então os mesmos links viram uma
            faixa com rolagem lateral logo abaixo do topo. */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-b border-[var(--tema-zinc-800)]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap shrink-0 transition-colors ${
                itemAtivo(item.match)
                  ? 'bg-[var(--tema-zinc-800)] text-white'
                  : 'text-[var(--tema-zinc-400)] hover:text-white'
              }`}
            >
              <item.Icon size={14} className="shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="border-t border-[var(--tema-zinc-800)] py-5 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--tema-zinc-500)]">
            <span>© {new Date().getFullYear()} Legado Digital</span>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--tema-zinc-300)]">Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-[var(--tema-zinc-300)]">Termos de Uso</Link>
          </div>
        </footer>
      </div>
      <LegadoBotWidget />
    </div>
  )
}
