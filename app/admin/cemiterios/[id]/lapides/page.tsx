'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { useBuscaDebounce } from '@/lib/useBuscaDebounce'
import { urlMidiaProtegida } from '@/lib/urlMidia'

interface ArvoreFila {
  id: string
  numero: number
  geometria_revisada: boolean
  total_tumulos: number
}

interface ArvoreQuadra {
  id: string
  numero: number
  nome: string | null
  geometria_revisada: boolean
  filas: ArvoreFila[]
}

interface ForaDeFileiraContagem {
  com_memorial: number
  com_coordenada: number
  sem_coordenada: number
}

interface HomenagemLink {
  id: string
  nome_completo: string
  slug: string | null
  foto_url?: string | null
}

// Jazigo da fileira aberta: quem está em cada gaveta vem das gavetas (fonte
// de verdade do vínculo, 2026-09-15); homenagens.lapide_id só cobre memorial
// que ainda não ganhou gaveta.
interface JazigoCartao {
  id: string
  nome: string | null
  numero: number | null
  gavetas: { linha: number; nome_sem_memorial: string | null; homenagens: HomenagemLink | null }[]
  homenagens: HomenagemLink[]
}

interface ResultadoBusca {
  chave: string
  lapideId: string
  titulo: string
  detalhe: string
}

interface LapideOrfa {
  id: string
  identificacao: string
  quadra: string | null
  lote: string | null
  latitude: number | null
  longitude: number | null
  coordenada_origem: string | null
  created_at: string
  homenagens: HomenagemLink[]
}

const FORM_INICIAL = { identificacao: '', quadra: '', lote: '', observacoes: '' }

// Pessoas do cartão, na ordem das gavetas. Mesmo memorial não repete.
function pessoasDoJazigo(j: JazigoCartao) {
  const lista: { chave: string; nome: string; memorial: HomenagemLink | null }[] = []
  const vistos = new Set<string>()
  for (const g of [...j.gavetas].sort((a, b) => a.linha - b.linha)) {
    if (g.homenagens) {
      if (vistos.has(g.homenagens.id)) continue
      vistos.add(g.homenagens.id)
      lista.push({ chave: g.homenagens.id, nome: g.homenagens.nome_completo, memorial: g.homenagens })
    } else if (g.nome_sem_memorial?.trim()) {
      lista.push({ chave: `g-${g.linha}`, nome: g.nome_sem_memorial.trim(), memorial: null })
    }
  }
  for (const h of j.homenagens) {
    if (vistos.has(h.id)) continue
    vistos.add(h.id)
    lista.push({ chave: h.id, nome: h.nome_completo, memorial: h })
  }
  return lista
}

export default function LapidesCemiterio() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <LapidesCemiterioInner />
    </Suspense>
  )
}

function LapidesCemiterioInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Navegação em 3 níveis (2026-09-16, wireframe aprovado pelo Rafael):
  // grade de quadras -> abas de fileira -> quadrados de jazigo. Quadra e
  // fileira ficam no endereço, então voltar da página do jazigo cai no mesmo
  // lugar. Com ~80 quadras e milhares de túmulos, nada abre tudo de uma vez.
  const quadraParam = searchParams.get('quadra')
  const filaParam = searchParams.get('fileira')

  const [cemiterioNome, setCemiterioNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [arvore, setArvore] = useState<{ quadras: ArvoreQuadra[]; fora_de_fileira: ForaDeFileiraContagem } | null>(null)
  const [orfas, setOrfas] = useState<LapideOrfa[]>([])
  const [msg, setMsg] = useState('')

  const [jazigosPorFila, setJazigosPorFila] = useState<Record<string, JazigoCartao[]>>({})
  const [carregandoFila, setCarregandoFila] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [irQuadra, setIrQuadra] = useState('')

  const [vinculando, setVinculando] = useState<LapideOrfa | null>(null)
  const [quadraVinculo, setQuadraVinculo] = useState('')
  const [filaVinculo, setFilaVinculo] = useState('')
  const [numeroVinculo, setNumeroVinculo] = useState('')

  const [removendo, setRemovendo] = useState<LapideOrfa | null>(null)

  const [avancadoAberto, setAvancadoAberto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Passe de mídia: <img> não manda credencial, então a foto de memorial
  // protegido apareceria quebrada no quadrado.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return
      fetch('/api/midia-sessao', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {})
    })
  }, [])

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function carregar() {
    setCarregando(true)
    setErro('')
    const [{ data: cemiterio, error: erroCemiterio }, { data: arv, error: erroArv }, { data: orfasData, error: erroOrfas }] = await Promise.all([
      supabase.from('cemiterios').select('nome').eq('id', id).single(),
      supabase.rpc('obter_arvore_lapides_cemiterio', { p_cemiterio_id: id }),
      supabase
        .from('lapides')
        .select('id, identificacao, quadra, lote, latitude, longitude, coordenada_origem, created_at, homenagens!homenagens_lapide_id_fkey(id, nome_completo, slug)')
        .eq('cemiterio_id', id)
        .is('fila_id', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    const erroReal = erroCemiterio || erroArv || erroOrfas
    if (erroReal) setErro(erroReal.message || String(erroReal))
    setCemiterioNome(cemiterio?.nome || '')
    setArvore(arv as any)
    setOrfas((orfasData as any) || [])
    setJazigosPorFila({})
    setCarregando(false)
  }

  const quadrasOrdenadas = useMemo(
    () => [...(arvore?.quadras || [])].sort((a, b) => a.numero - b.numero),
    [arvore]
  )
  const quadraAtual = quadraParam && quadraParam !== 'fora' ? quadrasOrdenadas.find((q) => String(q.numero) === quadraParam) || null : null
  const filasDaQuadra = useMemo(() => [...(quadraAtual?.filas || [])].sort((a, b) => a.numero - b.numero), [quadraAtual])
  const filaAtual = filasDaQuadra.find((f) => String(f.numero) === filaParam) || filasDaQuadra[0] || null

  function navegar(quadra: string | null, fileira: string | null) {
    const p = new URLSearchParams()
    if (quadra) p.set('quadra', quadra)
    if (fileira) p.set('fileira', fileira)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (!filaAtual || jazigosPorFila[filaAtual.id]) return
    const filaId = filaAtual.id
    setCarregandoFila(filaId)
    supabase
      .from('lapides')
      .select(
        'id, nome, numero, gavetas(linha, nome_sem_memorial, homenagens(id, nome_completo, slug, foto_url)), homenagens!homenagens_lapide_id_fkey(id, nome_completo, slug, foto_url)'
      )
      .eq('fila_id', filaId)
      .order('numero', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        setJazigosPorFila((s) => ({ ...s, [filaId]: (data as unknown as JazigoCartao[]) || [] }))
        setCarregandoFila(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filaAtual?.id])

  // Busca única: memorial, nome do jazigo ou código. Leva direto pra página
  // do jazigo encontrado.
  const { resultados: resultadoBusca, buscando } = useBuscaDebounce<ResultadoBusca>(busca, async (termoDigitado) => {
    // vírgula e parêntese quebrariam o filtro .or() do PostgREST
    const termo = termoDigitado.replace(/[,()%]/g, ' ').trim()
    const [{ data: lapidesData }, { data: memoriaisData }] = await Promise.all([
      supabase
        .from('lapides')
        .select('id, nome, codigo')
        .eq('cemiterio_id', id)
        .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
        .order('codigo')
        .limit(20),
      supabase
        .from('homenagens')
        .select('id, nome_completo, lapides!homenagens_lapide_id_fkey!inner(id, nome, codigo, cemiterio_id)')
        .eq('lapides.cemiterio_id', id)
        .ilike('nome_completo', `%${termo}%`)
        .limit(20),
    ])
    const saida: ResultadoBusca[] = []
    type MemorialAchado = { id: string; nome_completo: string; lapides: { id: string; nome: string | null; codigo: string | null } | null }
    for (const h of (memoriaisData as unknown as MemorialAchado[]) || []) {
      const l = h.lapides
      if (!l) continue
      saida.push({ chave: `m-${h.id}`, lapideId: l.id, titulo: h.nome_completo, detalhe: `Memorial · ${l.nome || l.codigo || ''}` })
    }
    for (const l of (lapidesData as { id: string; nome: string | null; codigo: string | null }[]) || []) {
      saida.push({ chave: `j-${l.id}`, lapideId: l.id, titulo: l.nome || l.codigo || 'Jazigo', detalhe: l.nome ? `Jazigo · ${l.codigo || ''}` : 'Jazigo' })
    }
    return saida
  })

  const quadraDoVinculo = arvore?.quadras.find((q) => q.id === quadraVinculo)

  async function confirmarVinculo() {
    if (!vinculando || !filaVinculo || !numeroVinculo) {
      setMsg('Escolhe quadra, fileira e número.')
      return
    }
    const { error } = await supabase.rpc('vincular_lapide_a_fila', {
      p_lapide_id: vinculando.id,
      p_fila_id: filaVinculo,
      p_numero: parseInt(numeroVinculo, 10),
    })
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg(`${vinculando.identificacao} vinculado(a) à fileira.`)
    setVinculando(null)
    setQuadraVinculo('')
    setFilaVinculo('')
    setNumeroVinculo('')
    await carregar()
  }

  async function confirmarRemocao(l: LapideOrfa) {
    await supabase.from('lapides').delete().eq('id', l.id)
    setRemovendo(null)
    setMsg(`${l.identificacao} removida.`)
    await carregar()
  }

  async function salvarManual(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('lapides').insert({ ...form, cemiterio_id: id })
    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }
    setForm(FORM_INICIAL)
    setSalvando(false)
    await carregar()
  }

  const totalForaDeFileira = useMemo(() => {
    if (!arvore) return 0
    return arvore.fora_de_fileira.com_memorial + arvore.fora_de_fileira.com_coordenada + arvore.fora_de_fileira.sem_coordenada
  }, [arvore])

  if (carregando) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>

  const termoQuadra = irQuadra.trim().toLowerCase()
  const quadrasVisiveis = termoQuadra
    ? quadrasOrdenadas.filter((q) => String(q.numero).startsWith(termoQuadra) || (q.nome || '').toLowerCase().includes(termoQuadra))
    : quadrasOrdenadas
  const totalJazigosCemiterio = quadrasOrdenadas.reduce((s, q) => s + q.filas.reduce((t, f) => t + f.total_tumulos, 0), 0)
  const jazigos = filaAtual ? jazigosPorFila[filaAtual.id] : undefined
  const verForaDeFileira = quadraParam === 'fora'

  return (
    <div>
      <Link href="/admin/cemiterios" className="text-[var(--tema-zinc-400)] hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Cemitérios
      </Link>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Jazigos — {cemiterioNome}</h1>
        <Link
          href={`/admin/cemiterios/${id}/mapa`}
          className="text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
        >
          Mapa
        </Link>
      </div>

      {erro && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 mb-4 text-sm text-red-300">
          <strong>Erro:</strong> {erro}
        </div>
      )}
      {msg && <p className="text-xs text-[var(--tema-zinc-300)] mb-4 bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] rounded-lg px-3 py-2">{msg}</p>}

      <div className="relative mb-5">
        <label htmlFor="busca-jazigos" className="block text-xs text-[var(--tema-zinc-400)] mb-1">
          Buscar memorial, jazigo ou código
        </label>
        <input
          id="busca-jazigos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex: Carlos Saraiva, Família Saraiva, Q36-R01-T011"
          autoComplete="off"
          className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded-lg px-3 py-2.5 text-sm text-white"
        />
        {(resultadoBusca || buscando) && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-700)] shadow-xl max-h-72 overflow-y-auto">
            {buscando ? (
              <p className="text-xs text-[var(--tema-zinc-500)] p-3">Buscando...</p>
            ) : resultadoBusca!.length === 0 ? (
              <p className="text-xs text-[var(--tema-zinc-500)] p-3">Nada encontrado neste cemitério.</p>
            ) : (
              resultadoBusca!.map((r) => (
                <Link
                  key={r.chave}
                  href={`/admin/cemiterios/${id}/lapides/${r.lapideId}/gavetas`}
                  className="block px-3 py-2 hover:bg-[var(--tema-zinc-800)] border-b border-[var(--tema-zinc-800)] last:border-0"
                >
                  <span className="block text-sm text-white">{r.titulo}</span>
                  <span className="block text-xs text-[var(--tema-zinc-400)]">{r.detalhe}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {!quadraAtual && !verForaDeFileira && (
        <>
          <div className="flex items-end gap-3 mb-3 flex-wrap">
            <div className="w-full sm:w-60">
              <label htmlFor="ir-quadra" className="block text-xs text-[var(--tema-zinc-400)] mb-1">
                Ir pra quadra
              </label>
              <input
                id="ir-quadra"
                value={irQuadra}
                onChange={(e) => setIrQuadra(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quadrasVisiveis[0]) navegar(String(quadrasVisiveis[0].numero), null)
                }}
                placeholder="Ex: 36"
                autoComplete="off"
                className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <span className="text-xs text-[var(--tema-zinc-400)] pb-2.5">
              {quadrasOrdenadas.length} quadra(s) · {totalJazigosCemiterio} jazigo(s)
            </span>
          </div>

          {quadrasOrdenadas.length === 0 ? (
            <p className="text-[var(--tema-zinc-500)] text-sm mb-6">
              Nenhuma quadra mapeada ainda. Use o <Link href={`/admin/cemiterios/${id}/mapa`} className="underline">mapa</Link> pra desenhar
              quadra/fileira e gerar túmulos.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
              {quadrasVisiveis.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => navegar(String(q.numero), null)}
                  className="text-left rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] hover:border-[#C9A46A] p-3 transition-colors"
                >
                  <span className="block text-sm font-semibold text-white">Quadra {q.numero}</span>
                  <span className="block text-xs text-[var(--tema-zinc-400)]">
                    {q.filas.reduce((t, f) => t + f.total_tumulos, 0)} jazigo(s)
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => navegar('fora', null)}
                className="text-left rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] hover:border-[#C9A46A] p-3 transition-colors"
              >
                <span className="block text-sm font-semibold text-white">Fora de fileira</span>
                <span className="block text-xs text-[var(--tema-zinc-400)]">{totalForaDeFileira} túmulo(s)</span>
              </button>
            </div>
          )}
        </>
      )}

      {(quadraAtual || verForaDeFileira) && (
        <div className="flex items-baseline gap-4 mb-3">
          <button type="button" onClick={() => navegar(null, null)} className="text-sm text-[var(--tema-zinc-400)] hover:text-white">
            ← Todas as quadras
          </button>
          <span className="text-lg font-semibold text-white">{quadraAtual ? `Quadra ${quadraAtual.numero}` : 'Fora de fileira'}</span>
        </div>
      )}

      {quadraParam && quadraParam !== 'fora' && !quadraAtual && (
        <p className="text-sm text-[var(--tema-zinc-400)] mb-6">Quadra {quadraParam} não existe neste cemitério.</p>
      )}

      {quadraAtual && (
        <div className="mb-8">
          {filasDaQuadra.length === 0 ? (
            <p className="text-sm text-[var(--tema-zinc-500)]">Nenhuma fileira desenhada nesta quadra.</p>
          ) : (
            <>
              <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--tema-zinc-800)] mb-4">
                {filasDaQuadra.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => navegar(String(quadraAtual.numero), String(f.numero))}
                    className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      filaAtual?.id === f.id
                        ? 'border-[#C9A46A] text-white font-medium'
                        : 'border-transparent text-[var(--tema-zinc-400)] hover:text-white'
                    }`}
                  >
                    Fileira {f.numero}
                  </button>
                ))}
              </nav>

              {carregandoFila === filaAtual?.id || !jazigos ? (
                <p className="text-sm text-[var(--tema-zinc-500)]">Carregando...</p>
              ) : jazigos.length === 0 ? (
                <p className="text-sm text-[var(--tema-zinc-500)]">Sem túmulos nesta fileira ainda.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {jazigos.map((j) => {
                    const pessoas = pessoasDoJazigo(j)
                    const urlJazigo = `/admin/cemiterios/${id}/lapides/${j.id}/gavetas`
                    return (
                      // Quadrado inteiro abre a página do jazigo; o nome do
                      // memorial (link próprio) abre a página pública.
                      <div
                        key={j.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(urlJazigo)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(urlJazigo)
                        }}
                        className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] hover:border-[#C9A46A] p-3 cursor-pointer transition-colors min-h-[96px]"
                      >
                        <p className="text-sm font-semibold text-white pb-2 mb-2 border-b border-[var(--tema-zinc-800)] truncate">
                          {j.nome || `Túmulo ${j.numero ?? '?'}`}
                        </p>
                        {pessoas.length === 0 ? (
                          <p className="text-xs text-[var(--tema-zinc-500)]">Ninguém registrado</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {pessoas.map((p) =>
                              p.memorial ? (
                                <li key={p.chave} className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[var(--tema-zinc-800)]"
                                    style={{ border: '2px solid #C9A46A' }}
                                  >
                                    {p.memorial.foto_url && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={urlMidiaProtegida(p.memorial.foto_url) || p.memorial.foto_url} alt="" className="w-full h-full object-cover" />
                                    )}
                                  </span>
                                  {p.memorial.slug ? (
                                    <Link
                                      href={`/homenagem/${p.memorial.slug}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-sm font-medium hover:underline truncate"
                                      style={{ color: '#C9A46A' }}
                                    >
                                      {p.nome}
                                    </Link>
                                  ) : (
                                    <span className="text-sm font-medium truncate" style={{ color: '#C9A46A' }}>{p.nome}</span>
                                  )}
                                </li>
                              ) : (
                                <li key={p.chave} className="text-sm text-[var(--tema-zinc-300)] truncate pl-9">
                                  {p.nome}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {verForaDeFileira && (
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          background: totalForaDeFileira > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
          border: totalForaDeFileira > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.3)',
        }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: totalForaDeFileira > 0 ? '#f87171' : '#4ade80' }}>
          {totalForaDeFileira > 0 ? `⚠ Túmulos fora de fileira — ${totalForaDeFileira}` : '✓ Nenhum túmulo fora de fileira'}
        </h2>
        {totalForaDeFileira > 0 && (
          <p className="text-xs text-[var(--tema-zinc-400)] mb-3">
            Sem quadra/fileira vinculada — confere com atenção antes de vincular um memorial aqui, pra não errar de túmulo.
          </p>
        )}

        {orfas.length > 0 && (
          <div className="space-y-2">
            {orfas
              .slice()
              .sort((a, b) => b.homenagens.length - a.homenagens.length)
              .map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg bg-[var(--tema-zinc-900)] border px-3 py-2"
                  style={{ borderColor: l.homenagens.length > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.3)' }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm text-white">{l.identificacao}</p>
                      <p className="text-xs text-[var(--tema-zinc-500)]">
                        {l.quadra && `Q${l.quadra} `}
                        {l.lote && `· L${l.lote} `}
                        {l.latitude != null ? `· coordenada: ${l.coordenada_origem || 'sim'}` : '· sem coordenada'}
                      </p>
                      {l.homenagens.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                          {l.homenagens.length} memorial(is) já vinculado(s): {l.homenagens.map((h) => h.nome_completo).join(', ')}
                          {l.homenagens.length > 1 && ' — confira se é a mesma família ou se é erro.'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setVinculando(l)
                          setQuadraVinculo('')
                          setFilaVinculo('')
                          setNumeroVinculo('')
                        }}
                        className="text-xs px-2 py-1 rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                      >
                        Vincular a uma fileira
                      </button>
                      {removendo?.id === l.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => confirmarRemocao(l)}
                            className="text-xs px-2 py-1 rounded bg-red-700 text-branco-fixo hover:bg-red-600"
                          >
                            {l.homenagens.length > 0 ? `Confirmar (desvincula ${l.homenagens.length})` : 'Confirmar remoção'}
                          </button>
                          <button type="button" onClick={() => setRemovendo(null)} className="text-xs text-[var(--tema-zinc-400)] hover:text-[var(--tema-zinc-200)]">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setRemovendo(l)} className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400">
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      )}

      {vinculando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setVinculando(null)}>
          <div className="bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">Vincular {vinculando.identificacao} a uma fileira</h3>
            <label className="block text-xs text-[var(--tema-zinc-400)] mb-1">Quadra</label>
            <select
              value={quadraVinculo}
              onChange={(e) => {
                setQuadraVinculo(e.target.value)
                setFilaVinculo('')
              }}
              className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-2 py-1.5 text-sm text-white mb-2"
            >
              <option value="">Escolhe a quadra</option>
              {arvore?.quadras.map((q) => (
                <option key={q.id} value={q.id}>
                  Quadra {q.numero}
                </option>
              ))}
            </select>
            <label className="block text-xs text-[var(--tema-zinc-400)] mb-1">Fileira</label>
            <select
              value={filaVinculo}
              onChange={(e) => setFilaVinculo(e.target.value)}
              disabled={!quadraVinculo}
              className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-2 py-1.5 text-sm text-white mb-2 disabled:opacity-40"
            >
              <option value="">Escolhe a fileira</option>
              {quadraDoVinculo?.filas.map((f) => (
                <option key={f.id} value={f.id}>
                  Fileira {f.numero} ({f.total_tumulos} túmulos)
                </option>
              ))}
            </select>
            <label className="block text-xs text-[var(--tema-zinc-400)] mb-1">Número do túmulo nessa fileira</label>
            <input
              type="number"
              min={1}
              value={numeroVinculo}
              onChange={(e) => setNumeroVinculo(e.target.value)}
              placeholder="ex: 12"
              className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-2 py-1.5 text-sm text-white mb-3"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmarVinculo}
                disabled={!filaVinculo || !numeroVinculo}
                className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-branco-fixo hover:bg-emerald-500 disabled:opacity-40"
              >
                Confirmar vínculo
              </button>
              <button type="button" onClick={() => setVinculando(null)} className="text-xs px-3 py-1.5 rounded border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <details className="mb-8" open={avancadoAberto} onToggle={(e) => setAvancadoAberto((e.target as HTMLDetailsElement).open)}>
        <summary className="text-xs text-[var(--tema-zinc-500)] hover:text-[var(--tema-zinc-300)] cursor-pointer mb-2">
          Avançado — cadastro manual sem quadra/fileira (cria túmulo fora de fileira)
        </summary>
        <form onSubmit={salvarManual} className="rounded-xl bg-[var(--tema-zinc-900)] border border-amber-900/30 p-4 mt-2 space-y-3 max-w-lg">
          <p className="text-xs text-amber-400">
            Só use isso pra caso emergencial. O túmulo nasce sem quadra/fileira -- vai pra seção "fora de fileira" acima, precisa vincular
            depois.
          </p>
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Identificação</label>
            <input
              placeholder="Ex: Q-12 L-23"
              required
              value={form.identificacao}
              onChange={(e) => setForm({ ...form, identificacao: e.target.value })}
              className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Quadra (texto livre)</label>
              <input
                value={form.quadra}
                onChange={(e) => setForm({ ...form, quadra: e.target.value })}
                className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Lote (texto livre)</label>
              <input
                value={form.lote}
                onChange={(e) => setForm({ ...form, lote: e.target.value })}
                className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Observações</label>
            <input
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-3 py-2 text-sm text-white"
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button
            type="submit"
            disabled={salvando}
            className="text-xs px-3 py-1.5 rounded bg-amber-700 text-branco-fixo hover:bg-amber-600 disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : '+ Adicionar jazigo fora de fileira'}
          </button>
        </form>
      </details>
    </div>
  )
}
