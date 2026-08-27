'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { urlMidiaProtegida } from '@/lib/urlMidia'

interface Memorial {
  id: string
  nome_completo: string
  cidade: string | null
  slug: string | null
  qr_code_url: string | null
  preenchido_por: 'funeraria' | 'familia' | null
  created_at: string
}

const PREENCHIDO_POR_LABEL: Record<string, string> = {
  familia: 'Família',
  funeraria: 'Funerária',
}

export default function ParceiroMemoriais() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <ParceiroMemoriaisInner />
    </Suspense>
  )
}

function ParceiroMemoriaisInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const suffix = parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''

  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [parceiroId, setParceiroId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    // ?parceiro_id= na URL só vale se quem está logado é staff de verdade
    // (veio do botão "Acessar Plataforma do Parceiro" na Central) — sem essa
    // checagem, um parceiro comum poderia editar a URL e ver memoriais de
    // outra empresa, ja que a leitura de homenagens e publica no banco.
    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }
    setParceiroId(meuParceiroId)

    if (!meuParceiroId) {
      // Sem parceiro vinculado: nunca roda a consulta sem filtro (RLS de leitura
      // pública em homenagens é aberta pra página do memorial funcionar, então
      // sem esse corte a consulta abaixo devolveria memoriais de todo mundo).
      setMemoriais([])
      setLoading(false)
      return
    }

    // Limpa rascunhos abandonados de versões antigas do cadastro (aba fechada
    // sem salvar) com mais de 2h — ficam públicos pra sempre se ninguém limpar.
    const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('homenagens')
      .delete()
      .eq('parceiro_id', meuParceiroId)
      .like('slug', 'rascunho-%')
      .lt('created_at', duasHorasAtras)

    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, cidade, slug, qr_code_url, preenchido_por, created_at')
      .eq('parceiro_id', meuParceiroId)
      .order('created_at', { ascending: false })

    setMemoriais(data || [])
    setLoading(false)
  }

  // "+ Novo Memorial" cria o rascunho na hora (id previsível, nome placeholder)
  // e já leva direto pra ficha completa — nada de tela intermediária. Rascunho
  // abandonado sem chegar a ser preenchido é limpo pelo load() acima (+2h).
  async function novoMemorial() {
    if (!parceiroId) return
    setCriando(true)
    setErro('')

    const id = crypto.randomUUID()
    const slug = `rascunho-${id.slice(0, 8)}`
    const { error } = await supabase.from('homenagens').insert({
      id,
      nome_completo: 'Novo memorial',
      slug,
      memorial_slug: slug,
      parceiro_id: parceiroId,
    })

    if (error) {
      setErro(error.message)
      setCriando(false)
      return
    }

    router.push(`/parceiro/memoriais/${id}${suffix}`)
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Meus Memoriais</h1>
        <Button onClick={novoMemorial} disabled={criando}>
          {criando ? 'Criando...' : '+ Novo Memorial'}
        </Button>
      </div>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

      {memoriais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--tema-zinc-400)]">Nenhum memorial cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--tema-zinc-400)] border-b border-[var(--tema-zinc-800)]">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Cidade</th>
                <th className="text-left py-3 px-4">Conteúdo por</th>
                <th className="text-left py-3 px-4">Criado em</th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map((m) => (
                <tr key={m.id} className="border-b border-[var(--tema-zinc-800)]/50 hover:bg-[var(--tema-zinc-900)]/50">
                  <td className="py-3 px-4 text-white">{m.nome_completo}</td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-300)]">{m.cidade || '-'}</td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-400)]">
                    {m.preenchido_por ? PREENCHIDO_POR_LABEL[m.preenchido_por] : '—'}
                  </td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-400)]">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    {m.slug && (
                      <a
                        href={`/homenagem/${m.slug}`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Ver página
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4">
                    <a
                      href={`/parceiro/memoriais/${m.id}${suffix}`}
                      className="text-[var(--tema-zinc-400)] hover:text-white text-xs"
                    >
                      Editar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
