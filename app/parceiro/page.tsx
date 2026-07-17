'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ScrollText, ClipboardList, CreditCard } from 'lucide-react'
import { supabase, getParceiroUser } from '@/lib/auth'

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

async function subirLogo(parceiroId: string, file: File) {
  const caminho = `parceiro-logos/${parceiroId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('memoriais').upload(caminho, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('memoriais').getPublicUrl(caminho)
  return data.publicUrl
}

const PAGAMENTO_LABEL: Record<string, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-green-900/50 text-green-400' },
  pendente: { label: 'Pendente', className: 'bg-yellow-900/50 text-yellow-400' },
  inadimplente: { label: 'Inadimplente', className: 'bg-red-900/50 text-red-400' },
}

export default function ParceiroDashboard() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <ParceiroDashboardInner />
    </Suspense>
  )
}

function ParceiroDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')

  const [parceiro, setParceiro] = useState<ParceiroInfo | null>(null)
  const [totalMemoriais, setTotalMemoriais] = useState(0)
  const [memoriaisQr, setMemoriaisQr] = useState<MemorialQr[]>([])
  const [loading, setLoading] = useState(true)
  const [acessandoFamiliaId, setAcessandoFamiliaId] = useState<string | null>(null)
  const [erroFamilia, setErroFamilia] = useState('')

  const [logoUrl, setLogoUrl] = useState('')
  const [descricaoPublica, setDescricaoPublica] = useState('')
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [salvandoPagina, setSalvandoPagina] = useState(false)
  const [paginaErro, setPaginaErro] = useState('')
  const [paginaSalva, setPaginaSalva] = useState(false)

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    let meuParceiroId = parceiroIdParam
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
    if (p) {
      setLogoUrl(p.logo_url || '')
      setDescricaoPublica(p.descricao_publica || '')
    }
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

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !parceiro) return
    setEnviandoLogo(true)
    setPaginaErro('')
    try {
      const url = await subirLogo(parceiro.id, file)
      setLogoUrl(url)
    } catch (err: any) {
      setPaginaErro(err.message || 'Erro ao enviar logo')
    }
    setEnviandoLogo(false)
  }

  async function salvarPaginaPublica(e: React.FormEvent) {
    e.preventDefault()
    if (!parceiro) return
    setSalvandoPagina(true)
    setPaginaErro('')
    setPaginaSalva(false)

    const { error } = await supabase
      .from('parceiros_b2b')
      .update({ logo_url: logoUrl || null, descricao_publica: descricaoPublica || null })
      .eq('id', parceiro.id)

    if (error) {
      setPaginaErro(error.message)
      setSalvandoPagina(false)
      return
    }

    setSalvandoPagina(false)
    setPaginaSalva(true)
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>
  if (!parceiro) return <p className="text-zinc-400">Parceiro não encontrado.</p>

  const pagamento = PAGAMENTO_LABEL[parceiro.status_pagamento] || PAGAMENTO_LABEL.em_dia
  const memoriaisHref = parceiroIdParam
    ? `/parceiro/memoriais?parceiro_id=${parceiroIdParam}`
    : '/parceiro/memoriais'

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">
        Dashboard — {parceiro.nome_fantasia || parceiro.razao_social}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href={memoriaisHref}
          className="block p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <ScrollText className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Memoriais cadastrados</h2>
          <p className="text-3xl font-bold text-white mt-2">{totalMemoriais}</p>
        </Link>

        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <ClipboardList className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Plano contratado</h2>
          <p className="text-xl font-bold text-white mt-2">{parceiro.plano_contratado || '—'}</p>
        </div>

        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <CreditCard className="mb-4 text-zinc-400" size={32} strokeWidth={1.5} />
          <h2 className="text-lg font-medium text-zinc-300">Status de pagamento</h2>
          <p className="mt-2">
            <span className={`px-2 py-1 rounded text-sm ${pagamento.className}`}>
              {pagamento.label}
            </span>
          </p>
        </div>
      </div>

      <Link
        href={memoriaisHref}
        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg mb-8"
      >
        Ver todos os memoriais →
      </Link>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Memoriais e QR Codes</h2>
        {erroFamilia && <p className="text-red-400 text-xs mb-2">{erroFamilia}</p>}
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
                    <td className="py-2 px-3 text-white">{m.nome_completo}</td>
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

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-400">Página pública (Editar)</h2>
          {parceiro.slug && (
            <a
              href={`/parceiros/${parceiro.slug}`}
              className="text-blue-400 hover:underline text-xs"
            >
              Ver página pública
            </a>
          )}
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Logo e descrição que aparecem na sua página pública, aonde as famílias encontram seus memoriais.
        </p>
        <form onSubmit={salvarPaginaPublica} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Logo</label>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-14 object-contain mb-2 bg-zinc-800 rounded p-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={enviandoLogo}
              className="block w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-zinc-700 file:text-white file:text-xs hover:file:bg-zinc-600"
            />
            {enviandoLogo && <p className="text-xs text-zinc-500 mt-1">Enviando logo...</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Descrição institucional</label>
            <textarea
              placeholder="Uma breve apresentação da sua funerária/cemitério pras famílias"
              rows={3}
              value={descricaoPublica}
              onChange={(e) => setDescricaoPublica(e.target.value)}
              className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
          </div>
          {paginaErro && <p className="text-red-400 text-sm">{paginaErro}</p>}
          {paginaSalva && <p className="text-green-400 text-sm">Salvo.</p>}
          <button
            type="submit"
            disabled={salvandoPagina}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg"
          >
            {salvandoPagina ? 'Salvando...' : 'Salvar página pública'}
          </button>
        </form>
      </div>
    </div>
  )
}
