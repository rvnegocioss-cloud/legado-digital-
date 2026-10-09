'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { getAdminUser, getParceiroUser, supabase } from '@/lib/auth'
import MapaPublicoCemiterio from '@/components/public/MapaPublicoCemiterioCarregador'

// Cemitério visto pelo parceiro: o mesmo mapa do site público (foto aérea +
// cruz em cada memorial), mostrando SÓ os memoriais dele.
//
// Até 2026-10-09 esta tela abria o mapa da Central em modo leitura
// (MapaCemiterio modo="leitura"), que expunha o mapeamento inteiro -- quadras,
// fileiras, todos os túmulos, ruas e pontos de referência. O Rafael mandou
// tirar: o mapeamento é trabalho e segredo da Central, o parceiro nunca vê a
// ferramenta de edição nem a estrutura. Os dados chegam por /api/parceiro-mapa,
// que só devolve os pontos dos memoriais do próprio parceiro.

interface MeuMemorial {
  id: string
  nome_completo: string
  slug: string | null
  lapide_id: string | null
}

interface DadosMapa {
  cemiterio: {
    nome: string
    cidade: string
    estado: string
    latitude: number | null
    longitude: number | null
    ortoMinzoom: number | null
    ortoMaxzoom: number | null
    ortoBounds: number[] | null
  }
  ortoUrl: string | null
  memoriais: any
  semLocal: number
}

export default function CemiterioParceiroDetalhe() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <CemiterioParceiroDetalheInner />
    </Suspense>
  )
}

function CemiterioParceiroDetalheInner() {
  const { id } = useParams<{ id: string }>()
  const parceiroIdParam = useSearchParams().get('parceiro_id')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [mapa, setMapa] = useState<DadosMapa | null>(null)
  const [meusMemoriais, setMeusMemoriais] = useState<MeuMemorial[]>([])

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, parceiroIdParam])

  async function carregar() {
    setLoading(true)
    setErro('')

    let meuParceiroId: string | null = null
    if (parceiroIdParam && (await getAdminUser())) meuParceiroId = parceiroIdParam
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }
    if (!meuParceiroId) {
      setErro('Parceiro não encontrado.')
      setLoading(false)
      return
    }

    const token = (await supabase.auth.getSession()).data.session?.access_token || ''
    const [res, { data: lista }] = await Promise.all([
      fetch(`/api/parceiro-mapa?cemiterioId=${id}&parceiroId=${meuParceiroId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      supabase
        .from('homenagens')
        .select('id, nome_completo, slug, lapide_id, lapides!homenagens_lapide_id_fkey!inner(cemiterio_id)')
        .eq('parceiro_id', meuParceiroId)
        .eq('lapides.cemiterio_id', id)
        .order('nome_completo'),
    ])

    const json = await res.json()
    if (res.ok) setMapa(json)
    else setErro(json.error || 'Não foi possível carregar o mapa.')
    setMeusMemoriais((lista as any) || [])
    setLoading(false)
  }

  if (loading) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  const sufixo = parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''
  const c = mapa?.cemiterio
  const temMapa = !!c && c.latitude != null && c.longitude != null

  return (
    <div>
      <Link href={`/parceiro/cemiterios${sufixo}`} className="text-[var(--tema-zinc-400)] hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Cemitérios
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">{c?.nome || 'Cemitério'}</h1>
      <p className="text-[var(--tema-zinc-400)] text-sm mb-6">
        Mapa dos seus memoriais neste cemitério, igual ao que a família vê no site. Cada cruz é um memorial seu.
      </p>

      {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

      {temMapa && c && (
        <div className="rounded-xl overflow-hidden border border-[var(--tema-zinc-800)]" style={{ background: '#10222f', color: '#F5F2EB' }}>
          <MapaPublicoCemiterio
            cemiterioNome={c.nome}
            cidade={c.cidade}
            estado={c.estado}
            latitude={c.latitude as number}
            longitude={c.longitude as number}
            ortoUrl={mapa!.ortoUrl}
            ortoMinzoom={c.ortoMinzoom}
            ortoMaxzoom={c.ortoMaxzoom}
            ortoBounds={c.ortoBounds}
            memoriais={mapa!.memoriais}
          />
        </div>
      )}

      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-4 mt-4">
        <h2 className="text-sm font-semibold text-white mb-1">Meus memoriais neste cemitério</h2>
        {meusMemoriais.length === 0 ? (
          <p className="text-xs text-[var(--tema-zinc-500)]">Nenhum memorial seu vinculado a esse cemitério ainda.</p>
        ) : (
          <ul className="space-y-1">
            {meusMemoriais.map((m) => (
              <li key={m.id} className="text-xs text-[var(--tema-zinc-300)]">
                <Link href={`/parceiro/memoriais/${m.id}${sufixo}`} className="hover:text-white">
                  {m.nome_completo}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!!mapa?.semLocal && (
          <p className="text-xs text-[var(--tema-zinc-500)] mt-3">
            {mapa.semLocal} memorial(is) ainda sem posição no mapa. A localização do túmulo é marcada pela equipe do Legado Digital.
          </p>
        )}
      </div>
    </div>
  )
}
