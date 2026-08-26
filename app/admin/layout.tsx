'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, Building2, MapPin, ScrollText, Users, Map, Search, Mail, Bell, ChevronDown, ChevronLeft, ChevronRight, MessageCircle, Home, Heart, Sun, Moon } from 'lucide-react'
import { getAdminUser, signOut, supabase } from '@/lib/auth'
import { rotuloTipoEmail } from '@/lib/emailLog'
import { useTema } from '@/lib/useTema'
import LegadoBotWidget from '@/components/LegadoBotWidget'

const ALLOWED_ROLES = ['Admin Legado Digital', 'Operador Legado Digital']

type AdminUser = {
  email: string
  usuarios_perfis: { perfis: { nome: string } | null }[]
}

type ParceiroResumo = {
  id: string
  nome_fantasia: string | null
  razao_social: string | null
}

// parceiros_b2b nao tem coluna "nome" -- tem nome_fantasia e razao_social, e
// funeraria cadastrada so pela razao social deixa nome_fantasia vazio.
function nomeDoParceiro(p: ParceiroResumo) {
  return p.nome_fantasia?.trim() || p.razao_social?.trim() || 'Parceiro sem nome'
}

type AlertaComunicacao = {
  id: string
  homenagem_id: string | null
  tipo: string
  destinatario: string
  status: string
  created_at: string
  homenagens: { nome_completo: string } | null
}

function tempoRelativo(iso: string) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas}h`
  const dias = Math.floor(horas / 24)
  return `há ${dias}d`
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuAberto, setMenuAberto] = useState(false)
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const { tema, alternarTema } = useTema()
  const [parceiros, setParceiros] = useState<ParceiroResumo[]>([])
  const [parceirosAberto, setParceirosAberto] = useState(false)
  const [alertas, setAlertas] = useState<AlertaComunicacao[]>([])
  const [alertasAberto, setAlertasAberto] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const adminUser = (await getAdminUser()) as AdminUser | null
        const roles = adminUser?.usuarios_perfis?.map((up) => up.perfis?.nome) ?? []
        const authorized = roles.some((r) => r && ALLOWED_ROLES.includes(r))

        if (!authorized && pathname !== '/admin/login') {
          router.push('/admin/login')
          return
        }
        setUser(authorized ? adminUser : null)
      } catch {
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [pathname, router])

  useEffect(() => {
    // Pedia a coluna 'nome', que nunca existiu nessa tabela: o select falhava,
    // data vinha null e o dropdown dizia "Nenhum parceiro cadastrado ainda"
    // mesmo com parceiros cadastrados -- erro silencioso, nada no console da
    // tela indicava a causa.
    supabase
      .from('parceiros_b2b')
      .select('id, nome_fantasia, razao_social')
      .order('razao_social')
      .then(({ data, error }) => {
        if (error) console.error('Falha ao carregar parceiros do header:', error.message)
        setParceiros(data || [])
      })
  }, [])

  // Alerta = feed das comunicações que o sistema já registra (emails_enviados,
  // mesma tabela que alimenta /admin/emails) -- nada de tabela nova, só
  // superfície do que já existe direto no header, com link pro memorial.
  useEffect(() => {
    supabase
      .from('emails_enviados')
      .select('id, homenagem_id, tipo, destinatario, status, created_at, homenagens(nome_completo)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setAlertas((data as any) || []))
  }, [])

  const alertasComErro = alertas.filter((a) => a.status === 'erro').length

  // Página de login não precisa do layout admin
  if (pathname === '/admin/login') return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tema-zinc-950)]">
        <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
      </div>
    )
  }

  if (!user) return null

  async function handleLogout() {
    await signOut()
    router.push('/admin/login')
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/parceiros', label: 'Parceiros', Icon: Building2 },
    { href: '/admin/cemiterios', label: 'Cemitérios', Icon: MapPin },
    { href: '/admin/memoriais', label: 'Memoriais', Icon: ScrollText },
    { href: '/admin/usuarios', label: 'Usuários', Icon: Users },
    { href: '/admin/emails', label: 'Comunicações', Icon: Mail },
    { href: '/admin/mapa', label: 'Mapa', Icon: Map },
    { href: '/busca', label: 'Página Pública', Icon: Search },
    { href: '/familia/login', label: 'Portal da Família', Icon: Heart },
    { href: '/', label: 'Voltar pro Site', Icon: Home },
  ]

  return (
    <div className="min-h-screen bg-[var(--tema-zinc-950)] text-white flex">
      <aside className={`hidden md:flex md:flex-col shrink-0 border-r border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)]/60 transition-all duration-200 ${sidebarAberta ? 'w-60' : 'w-16'}`}>
        <div className="flex items-center h-20 px-3 border-b border-[var(--tema-zinc-800)] shrink-0 justify-between">
          <Link href="/admin" className={`flex items-center overflow-hidden ${sidebarAberta ? '' : 'w-0'}`}>
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
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarAberta ? undefined : item.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-[var(--tema-zinc-800)] text-white'
                  : 'text-[var(--tema-zinc-400)] hover:text-white hover:bg-[var(--tema-zinc-800)]/50'
              }`}
            >
              <item.Icon size={16} className="shrink-0" />
              {sidebarAberta && item.label}
            </Link>
          ))}
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
        <header className="h-16 border-b border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)]/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={64} className="md:hidden h-12 w-auto object-contain" />
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="md:hidden text-[var(--tema-zinc-400)] hover:text-white transition-colors"
              aria-label="Voltar pro Site"
              title="Voltar pro Site"
            >
              <Home size={18} />
            </Link>
            <div
              className="relative hidden sm:block"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setParceirosAberto(false)
              }}
            >
              <button
                onClick={() => setParceirosAberto(!parceirosAberto)}
                className="flex items-center gap-1.5 text-sm text-[var(--tema-zinc-400)] hover:text-white transition-colors"
              >
                <Building2 size={16} />
                Parceiros
                <ChevronDown size={14} />
              </button>
              {parceirosAberto && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)] shadow-lg py-1 z-50 max-h-80 overflow-y-auto">
                  {parceiros.length === 0 ? (
                    <p className="px-4 py-2 text-xs text-[var(--tema-zinc-500)]">Nenhum parceiro cadastrado ainda.</p>
                  ) : (
                    parceiros.map((p) => (
                      <Link
                        key={p.id}
                        href={`/parceiro?parceiro_id=${p.id}`}
                        onClick={() => setParceirosAberto(false)}
                        className="block px-4 py-2 text-sm text-[var(--tema-zinc-300)] hover:text-white hover:bg-[var(--tema-zinc-800)]"
                      >
                        {nomeDoParceiro(p)}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={alternarTema}
              className="text-[var(--tema-zinc-400)] hover:text-white transition-colors"
              aria-label={tema === 'escuro' ? 'Mudar pro tema claro' : 'Mudar pro tema escuro'}
              title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
            >
              {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setAlertasAberto(false)
              }}
            >
              <button
                onClick={() => setAlertasAberto(!alertasAberto)}
                className="relative text-[var(--tema-zinc-400)] hover:text-white transition-colors"
                aria-label="Alertas de comunicações"
                title="Alertas de comunicações"
              >
                <Bell size={18} />
                {alertasComErro > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-branco-fixo text-[10px] font-semibold flex items-center justify-center">
                    {alertasComErro}
                  </span>
                )}
              </button>
              {alertasAberto && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)] shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                  {alertas.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-[var(--tema-zinc-500)]">Nenhuma comunicação registrada ainda.</p>
                  ) : (
                    alertas.map((a) => (
                      <Link
                        key={a.id}
                        href={a.homenagem_id ? `/admin/memoriais/${a.homenagem_id}` : '/admin/emails'}
                        onClick={() => setAlertasAberto(false)}
                        className="block px-4 py-2.5 hover:bg-[var(--tema-zinc-800)] border-b border-[var(--tema-zinc-800)]/50 last:border-0"
                      >
                        <p className="text-xs flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.status === 'erro' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span className="text-[var(--tema-zinc-300)]">{rotuloTipoEmail(a.tipo)}</span>
                          <span className="text-[var(--tema-zinc-600)]">·</span>
                          <span className="text-[var(--tema-zinc-500)] ml-auto shrink-0">{tempoRelativo(a.created_at)}</span>
                        </p>
                        <p className="text-xs text-[var(--tema-zinc-500)] mt-0.5 truncate">
                          {a.homenagens?.nome_completo || a.destinatario}
                        </p>
                      </Link>
                    ))
                  )}
                  <Link
                    href="/admin/emails"
                    onClick={() => setAlertasAberto(false)}
                    className="block px-4 py-2 text-xs text-center hover:bg-[var(--tema-zinc-800)]"
                    style={{ color: '#C9A46A' }}
                  >
                    Ver todas as comunicações
                  </Link>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)] hover:text-white transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--tema-zinc-800)] flex items-center justify-center text-xs" style={{ color: '#C9A46A' }}>
                  {user.email.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.email}</span>
                <ChevronDown size={14} />
              </button>
              {menuAberto && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-900)] shadow-lg py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--tema-zinc-300)] hover:text-white hover:bg-[var(--tema-zinc-800)]"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* data-tema fica em document.documentElement (lib/useTema.ts), não aqui --
            cobre toda a Central de uma vez, inclusive modal/dialog que renderiza
            via portal direto em document.body, fora dessa árvore. */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto bg-[var(--tema-zinc-950)]">
          {children}
        </main>
      </div>
      <LegadoBotWidget />
    </div>
  )
}
