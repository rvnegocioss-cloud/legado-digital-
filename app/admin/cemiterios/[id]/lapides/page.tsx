'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { corDaFila } from '@/lib/coresFila'

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
}

interface LapideChip {
  id: string
  codigo: string | null
  numero: number | null
  situacao: string
  coordenada_precisao: string | null
  homenagens: HomenagemLink[]
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

export default function LapidesCemiterio() {
  const { id } = useParams<{ id: string }>()
  const [cemiterioNome, setCemiterioNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [arvore, setArvore] = useState<{ quadras: ArvoreQuadra[]; fora_de_fileira: ForaDeFileiraContagem } | null>(null)
  const [orfas, setOrfas] = useState<LapideOrfa[]>([])
  const [msg, setMsg] = useState('')

  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({})
  const [tumulosPorFila, setTumulosPorFila] = useState<Record<string, LapideChip[]>>({})
  const [carregandoFila, setCarregandoFila] = useState<string | null>(null)
  const [tumuloSelecionado, setTumuloSelecionado] = useState<LapideChip | null>(null)

  const [busca, setBusca] = useState('')
  const [resultadoBusca, setResultadoBusca] = useState<LapideChip[] | null>(null)

  const [vinculando, setVinculando] = useState<LapideOrfa | null>(null)
  const [quadraVinculo, setQuadraVinculo] = useState('')
  const [filaVinculo, setFilaVinculo] = useState('')
  const [numeroVinculo, setNumeroVinculo] = useState('')

  const [removendo, setRemovendo] = useState<LapideOrfa | null>(null)

  const [avancadoAberto, setAvancadoAberto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    setCarregando(true)
    const [{ data: cemiterio }, { data: arv }, { data: orfasData }] = await Promise.all([
      supabase.from('cemiterios').select('nome').eq('id', id).single(),
      supabase.rpc('obter_arvore_lapides_cemiterio', { p_cemiterio_id: id }),
      supabase
        .from('lapides')
        .select('id, identificacao, quadra, lote, latitude, longitude, coordenada_origem, created_at, homenagens(id, nome_completo)')
        .eq('cemiterio_id', id)
        .is('fila_id', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setCemiterioNome(cemiterio?.nome || '')
    setArvore(arv as any)
    setOrfas((orfasData as any) || [])
    setTumulosPorFila({})
    setCarregando(false)
  }

  async function alternarFila(filaId: string) {
    const abrindo = !expandidas[filaId]
    setExpandidas((s) => ({ ...s, [filaId]: abrindo }))
    if (abrindo && !tumulosPorFila[filaId]) {
      setCarregandoFila(filaId)
      const { data } = await supabase
        .from('lapides')
        .select('id, codigo, numero, situacao, coordenada_precisao, homenagens(id, nome_completo)')
        .eq('fila_id', filaId)
        .order('numero', { ascending: true })
      setTumulosPorFila((s) => ({ ...s, [filaId]: (data as any) || [] }))
      setCarregandoFila(null)
    }
  }

  async function buscarPorCodigo(termo: string) {
    setBusca(termo)
    if (termo.trim().length < 2) {
      setResultadoBusca(null)
      return
    }
    const { data } = await supabase
      .from('lapides')
      .select('id, codigo, numero, situacao, coordenada_precisao, homenagens(id, nome_completo)')
      .eq('cemiterio_id', id)
      .not('codigo', 'is', null)
      .ilike('codigo', `%${termo.trim()}%`)
      .order('codigo')
      .limit(50)
    setResultadoBusca((data as any) || [])
  }

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

  return (
    <div>
      <Link href="/admin/cemiterios" className="text-[var(--tema-zinc-400)] hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Cemitérios
      </Link>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Lápides — {cemiterioNome}</h1>
        <Link
          href={`/admin/cemiterios/${id}/mapa`}
          className="text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
        >
          Mapa (marcar túmulos)
        </Link>
      </div>
      <p className="text-[var(--tema-zinc-400)] text-sm mb-4">
        Organizado por Quadra → Fileira → Túmulo, do jeito que foi mapeado. Clica numa fileira pra ver os túmulos dela.
      </p>

      {msg && <p className="text-xs text-[var(--tema-zinc-300)] mb-4 bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] rounded-lg px-3 py-2">{msg}</p>}

      <div className="mb-6 max-w-md">
        <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Buscar por código (ex: Q01-R02)</label>
        <input
          value={busca}
          onChange={(e) => buscarPorCodigo(e.target.value)}
          placeholder="Digite o código do túmulo"
          className="w-full bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-3 py-2 text-sm text-white"
        />
        {resultadoBusca && (
          <div className="mt-2 rounded-lg bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] max-h-56 overflow-y-auto">
            {resultadoBusca.length === 0 ? (
              <p className="text-xs text-[var(--tema-zinc-500)] p-3">Nenhum túmulo com esse código.</p>
            ) : (
              resultadoBusca.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setTumuloSelecionado(l)}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-200)] border-b border-[var(--tema-zinc-800)] last:border-0"
                >
                  {l.codigo} {l.homenagens.length > 0 && <span className="text-[var(--tema-zinc-500)]">— {l.homenagens.length} memorial(is)</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {!arvore || arvore.quadras.length === 0 ? (
        <p className="text-[var(--tema-zinc-500)] text-sm mb-6">
          Nenhuma quadra mapeada ainda. Use o <Link href={`/admin/cemiterios/${id}/mapa`} className="underline">mapa</Link> pra desenhar
          quadra/fileira e gerar túmulos.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {arvore.quadras.map((q) => (
              <div key={q.id} className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-3" style={{ minWidth: 300, width: 300 }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">
                    Quadra {q.numero} {q.geometria_revisada && <span className="text-emerald-400">🔒</span>}
                  </h2>
                  <span className="text-xs text-[var(--tema-zinc-500)]">{q.filas.length} fileira(s)</span>
                </div>

                {q.filas.length === 0 ? (
                  <p className="text-xs text-[var(--tema-zinc-500)]">Nenhuma fileira desenhada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {q.filas.map((f) => {
                      const filaKey = f.id
                      const aberta = !!expandidas[filaKey]
                      return (
                        <div key={f.id} className="rounded border border-[var(--tema-zinc-800)]">
                          <button
                            type="button"
                            onClick={() => alternarFila(f.id)}
                            className="w-full flex items-center gap-1.5 text-left text-xs px-2 py-1.5 text-[var(--tema-zinc-200)] hover:bg-[var(--tema-zinc-800)]"
                          >
                            {aberta ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: corDaFila(f.numero) }} />
                            Fileira {f.numero} {f.geometria_revisada && <span className="text-emerald-400">🔒</span>}
                            <span className="text-[var(--tema-zinc-500)] ml-auto">{f.total_tumulos}</span>
                          </button>
                          {aberta && (
                            <div className="p-2 border-t border-[var(--tema-zinc-800)]">
                              {carregandoFila === f.id ? (
                                <p className="text-xs text-[var(--tema-zinc-500)]">Carregando...</p>
                              ) : (tumulosPorFila[f.id]?.length ?? 0) === 0 ? (
                                <p className="text-xs text-[var(--tema-zinc-500)]">Sem túmulos ainda.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {tumulosPorFila[f.id]!.map((l) => (
                                    <button
                                      key={l.id}
                                      onClick={() => setTumuloSelecionado(l)}
                                      title={l.codigo || `#${l.numero}`}
                                      className="text-[10px] px-1.5 py-1 rounded"
                                      style={{
                                        border: l.situacao === 'confirmada' ? '1px solid #3f3f46' : '1px dashed #52525b',
                                        background: l.homenagens.length > 0 ? 'rgba(201,164,106,0.15)' : 'transparent',
                                        color: l.homenagens.length > 0 ? '#C9A46A' : '#a1a1aa',
                                      }}
                                    >
                                      {l.numero ?? '?'}
                                      {l.homenagens.length > 1 && '⚠'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {tumuloSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setTumuloSelecionado(null)}>
          <div className="bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">{tumuloSelecionado.codigo || `Túmulo #${tumuloSelecionado.numero}`}</h3>
              <button onClick={() => setTumuloSelecionado(null)} className="text-[var(--tema-zinc-400)] hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-[var(--tema-zinc-500)] mb-1">
              Situação: {tumuloSelecionado.situacao} · Precisão: {tumuloSelecionado.coordenada_precisao || '—'}
            </p>
            <p className="text-xs text-[var(--tema-zinc-400)] mb-3">
              {tumuloSelecionado.homenagens.length === 0
                ? 'Nenhum memorial vinculado.'
                : `${tumuloSelecionado.homenagens.length} memorial(is): ${tumuloSelecionado.homenagens.map((h) => h.nome_completo).join(', ')}`}
            </p>
            <div className="flex flex-col gap-1 text-xs">
              <Link href={`/admin/cemiterios/${id}/lapides/${tumuloSelecionado.id}/gavetas`} className="text-[var(--tema-zinc-300)] hover:text-white">
                Ver gavetas
              </Link>
              <Link href={`/admin/cemiterios/${id}/lapides/${tumuloSelecionado.id}/gavetas-3d`} style={{ color: '#C9A46A' }}>
                Ver gavetas 3D
              </Link>
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
            {salvando ? 'Salvando...' : '+ Adicionar lápide fora de fileira'}
          </button>
        </form>
      </details>
    </div>
  )
}
