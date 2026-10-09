'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ScrollText, ClipboardList, CreditCard } from 'lucide-react'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { urlMidiaProtegida } from '@/lib/urlMidia'

interface ParceiroInfo {
  id: string
  nome_fantasia: string | null
  razao_social: string
  plano_contratado: string | null
  status_pagamento: string
  slug: string | null
  logo_url: string | null
  descricao_publica: string | null
}

interface MemorialQr {
  id: string
  nome_completo: string
  slug: string | null
  qr_code_url: string | null
}

async function acessarPortalFamilia(memorialId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/acessar-familia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ memorialId }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro ao acessar o Portal da Família')
  return json.slug as string
}

const PAGAMENTO_LABEL: Record<string, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-green-900/50 text-green-400' },
  pendente: { label: 'Pendente', className: 'bg-yellow-900/50 text-yellow-400' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-900/50 text-red-400' },
}

// Nenhuma tela do sistema ainda escreve status_pagamento (modulo financeiro
// é Fase 4) — cair no rotulo verde "Em dia" por padrão pra valor
// desconhecido/nulo dava a entender que alguém confirmou o pagamento,
// quando na verdade nunca foi configurado. Neutro é o estado honesto.
const PAGAMENTO_NAO_CONFIGURADO = { label: 'Não configurado', className: 'bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-400)]' }

export default function ParceiroDashboard() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <ParceiroDashboardInner />
    </Suspense>
  )
}

function ParceiroDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')

  // Abas no topo, mesmo padrão aprovado no Portal da Família e na ficha do
  // parceiro (2026-09-16): um tema por vez, sem nada empilhado embaixo.
  const [aba, setAba] = useState<'resumo' | 'memoriais' | 'pagina'>('resumo')
  const [parceiro, setParceiro] = useState<ParceiroInfo | null>(null)
  const [totalMemoriais, setTotalMemoriais] = useState(0)
  const [memoriaisQr, setMemoriaisQr] = useState<MemorialQr[]>([])
  const [loading, setLoading] = useState(true)
  const [acessandoFamiliaId, setAcessandoFamiliaId] = useState<string | null>(null)
  const [erroFamilia, setErroFamilia] = useState('')

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    // ?parceiro_id= na URL só vale se quem está logado é staff de verdade —
    // mesma regra do /parceiro/memoriais, sem isso um parceiro comum poderia
    // editar a URL e ver o dashboard de outra empresa.
    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    if (!meuParceiroId) {
      setLoading(false)
      return
    }

    const [{ data: p }, { count }, { data: memoriais }] = await Promise.all([
      supabase
        .from('parceiros_b2b')
        .select('id, nome_fantasia, razao_social, plano_contratado, status_pagamento, slug, logo_url, descricao_publica')
        .eq('id', meuParceiroId)
        .single(),
      supabase
        .from('homenagens')
        .select('*', { count: 'exact', head: true })
        .eq('parceiro_id', meuParceiroId),
      supabase
        .from('homenagens')
        .select('id, nome_completo, slug, qr_code_url')
        .eq('parceiro_id', meuParceiroId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setParceiro(p)
    setTotalMemoriais(count || 0)
    setMemoriaisQr(memoriais || [])
    setLoading(false)
  }

  async function handleAcessarFamilia(m: MemorialQr) {
    setAcessandoFamiliaId(m.id)
    setErroFamilia('')
    try {
      const slug = await acessarPortalFamilia(m.id)
      router.push(`/familia/${slug}`)
    } catch (err: any) {
      setErroFamilia(err.message)
      setAcessandoFamiliaId(null)
    }
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  if (!parceiro) return <p className="text-[var(--tema-zinc-400)]">Parceiro não encontrado.</p>

  const pagamento = PAGAMENTO_LABEL[parceiro.status_pagamento] || PAGAMENTO_NAO_CONFIGURADO
  const memoriaisHref = parceiroIdParam
    ? `/parceiro/memoriais?parceiro_id=${parceiroIdParam}`
    : '/parceiro/memoriais'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        Dashboard — {parceiro.nome_fantasia || parceiro.razao_social}
      </h1>

      <nav className="flex items-center gap-1 flex-wrap border-b border-[var(--tema-zinc-800)] mb-6 -mx-1">
        {([
          ['resumo', 'Resumo'],
          ['memoriais', 'Memoriais e QR Codes'],
          ['pagina', 'Página Pública'],
        ] as const).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              aba === id
                ? 'border-[#C9A46A] text-white font-medium'
                : 'border-transparent text-[var(--tema-zinc-400)] hover:text-white'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </nav>

      <div className={aba === 'resumo' ? '' : 'hidden'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href={memoriaisHref}
          className="block p-6 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] hover:border-[var(--tema-zinc-700)] transition-colors"
        >
          <ScrollText className="mb-4 text-[var(--tema-zinc-400)]" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-[var(--tema-zinc-300)]">Memoriais cadastrados</h2>
          <p className="text-3xl font-bold text-white mt-2">{totalMemoriais}</p>
        </Link>

        <div className="p-6 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)]">
          <ClipboardList className="mb-4 text-[var(--tema-zinc-400)]" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-[var(--tema-zinc-300)]">Plano contratado</h2>
          <p className="text-xl font-bold text-white mt-2">{parceiro.plano_contratado || '—'}</p>
        </div>

        <div className="p-6 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)]">
          <CreditCard className="mb-4 text-[var(--tema-zinc-400)]" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-[var(--tema-zinc-300)]">Status de pagamento</h2>
          <p className="mt-2">
            <span className={`px-2 py-1 rounded text-sm ${pagamento.className}`}>
              {pagamento.label}
            </span>
          </p>
        </div>
      </div>

      <Link
        href={memoriaisHref}
        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-branco-fixo text-sm font-medium rounded-lg mb-8"
      >
        Ver todos os memoriais →
      </Link>
      </div>

      <div className={aba === 'memoriais' ? '' : 'hidden'}>
      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6">
        <h2 className="text-sm font-medium text-[var(--tema-zinc-400)] mb-4">Memoriais e QR Codes</h2>
        {erroFamilia && <p className="text-red-400 text-xs mb-2">{erroFamilia}</p>}
        {memoriaisQr.length === 0 ? (
          <p className="text-[var(--tema-zinc-400)] text-sm">Nenhum memorial cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--tema-zinc-400)] border-b border-[var(--tema-zinc-800)]">
                  <th className="text-left py-2 px-3">QR Code</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3"></th>
                  <th className="text-left py-2 px-3"></th>
                  <th className="text-left py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {memoriaisQr.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--tema-zinc-800)]/50 hover:bg-[var(--tema-zinc-900)]/50">
                    <td className="py-2 px-3">
                      {m.qr_code_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlMidiaProtegida(m.qr_code_url) || m.qr_code_url} alt="" className="w-10 h-10 rounded bg-white p-0.5" />
                      ) : (
                        <span className="text-[var(--tema-zinc-600)] text-xs">Sem QR ainda</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-white">{m.nome_completo}</td>
                    <td className="py-2 px-3">
                      {m.qr_code_url && (
                        <a
                          href={urlMidiaProtegida(m.qr_code_url) || m.qr_code_url}
                          download={`qrcode-${m.slug}.png`}
                          className="text-blue-400 hover:underline text-xs"
                        >
                          Baixar QR Code
                        </a>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {m.slug && (
                        <a href={`/homenagem/${m.slug}`} className="text-[var(--tema-zinc-400)] hover:text-white text-xs">
                          Ver página
                        </a>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {m.slug && (
                        <button
                          type="button"
                          onClick={() => handleAcessarFamilia(m)}
                          disabled={acessandoFamiliaId === m.id}
                          className="text-amber-400 hover:underline text-xs whitespace-nowrap disabled:opacity-60"
                        >
                          {acessandoFamiliaId === m.id ? 'Entrando...' : 'Portal da Família'}
                        </button>
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

      {/* A edição da página saiu daqui em 2026-10-09: virou a tela "Minha página"
          do menu (logo, capa, textos, contato e o botão de apresentar). A aba fica
          só como atalho, pra quem estava acostumado a procurar aqui. */}
      <div className={aba === 'pagina' ? '' : 'hidden'}>
        <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-6 max-w-xl">
          <h2 className="text-sm font-medium text-white mb-1">A edição da página mudou de lugar</h2>
          <p className="text-[var(--tema-zinc-500)] text-sm mb-4">
            Logo, foto de capa, frase, contato e a apresentação pra família agora ficam em “Minha página”, no menu ao lado.
          </p>
          <Link
            href={parceiroIdParam ? `/parceiro/minha-pagina?parceiro_id=${parceiroIdParam}` : '/parceiro/minha-pagina'}
            className="inline-block px-4 py-2 bg-[#C9A46A] hover:bg-[#dfc08a] text-[#1a1408] text-sm font-semibold rounded-lg"
          >
            Abrir Minha página
          </Link>
        </div>
      </div>
    </div>
  )
}
