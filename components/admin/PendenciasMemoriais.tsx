'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, LayoutGrid, List, Pencil } from 'lucide-react'
import {
  TIPOS_FALTA,
  type MemorialPendente,
  type OrigemMemorial,
  type TipoFalta,
} from '@/lib/pendenciasMemorial'

// Aba "Pendências dos memoriais" da Central de Comunicações. O cálculo do que
// falta mora em lib/pendenciasMemorial.ts; aqui só filtro e exibição.
// Ações que disparam e-mail (Reenviar acesso / Lembrar família) ficam pra
// etapa 4 -- por enquanto só "Abrir ficha".

const POR_PAGINA = 50

const ROTULO_ORIGEM: Record<OrigemMemorial, string> = {
  cemiterio: 'cemitério',
  parceiro: 'parceiro',
  central: 'central',
  outra: 'outra origem',
}

function maiuscula(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}

function textoIdade(dias: number) {
  return dias === 0 ? 'hoje' : `há ${dias} dia${dias === 1 ? '' : 's'}`
}

const CAMPO =
  'w-full rounded-lg px-2.5 py-2 text-sm bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white focus:outline-none focus:border-[#C9A46A]'
const ROTULO = 'block text-xs text-[var(--tema-zinc-400)] mt-3 mb-1.5'

export default function PendenciasMemoriais({
  pendencias,
  carregando,
  nomeParceiro,
}: {
  pendencias: MemorialPendente[]
  carregando: boolean
  nomeParceiro: Record<string, string>
}) {
  const [visao, setVisao] = useState<'tipo' | 'memorial'>('tipo')
  const [faltas, setFaltas] = useState<Set<TipoFalta>>(new Set(TIPOS_FALTA))
  const [quem, setQuem] = useState<'todos' | 'familia' | 'equipe'>('todos')
  const [parceiro, setParceiro] = useState('todos')
  const [origem, setOrigem] = useState<'todas' | OrigemMemorial>('todas')
  const [idade, setIdade] = useState<'todas' | 'ate7' | 'de8a14' | 'mais14' | 'mais30'>('todas')
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(POR_PAGINA)

  useEffect(() => {
    setLimite(POR_PAGINA)
  }, [visao, faltas, quem, parceiro, origem, idade, busca])

  const contagem = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of TIPOS_FALTA) c[t] = pendencias.filter((m) => m.falta.includes(t)).length
    return c
  }, [pendencias])

  const idsParceiros = useMemo(
    () => Array.from(new Set(pendencias.map((m) => m.parceiro_id).filter(Boolean) as string[])),
    [pendencias]
  )

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return pendencias.filter((m) => {
      if (!m.falta.some((f) => faltas.has(f))) return false
      if (quem !== 'todos' && m.quem !== quem) return false
      if (parceiro === 'sem' ? m.parceiro_id !== null : parceiro !== 'todos' && m.parceiro_id !== parceiro) return false
      if (origem !== 'todas' && m.origem !== origem) return false
      if (idade === 'ate7' && m.dias > 7) return false
      if (idade === 'de8a14' && (m.dias < 8 || m.dias > 14)) return false
      if (idade === 'mais14' && m.dias <= 14) return false
      if (idade === 'mais30' && m.dias <= 30) return false
      if (termo && !m.nome_completo.toLowerCase().includes(termo)) return false
      return true
    })
  }, [pendencias, faltas, quem, parceiro, origem, idade, busca])

  function alternarFalta(t: TipoFalta) {
    setFaltas((atual) => {
      const novo = new Set(atual)
      if (novo.has(t)) novo.delete(t)
      else novo.add(t)
      return novo
    })
  }

  function linha(m: MemorialPendente, mostrarFalta: boolean) {
    const nomePar = m.parceiro_id ? nomeParceiro[m.parceiro_id] || 'Parceiro' : 'Sem parceiro'
    return (
      <div
        key={m.id}
        className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-t border-[var(--tema-zinc-800)] first:border-t-0"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
          <span className="w-[30px] h-[30px] rounded-full bg-[var(--tema-zinc-800)] flex items-center justify-center text-xs shrink-0" style={{ color: '#C9A46A' }}>
            {iniciais(m.nome_completo)}
          </span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">
              {m.nome_completo}
              {m.figura_publica && (
                <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(8,145,178,.2)', color: '#22d3ee' }}>
                  Ilustre
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--tema-zinc-400)]">
              {nomePar} · cadastrado via {ROTULO_ORIGEM[m.origem]} · {textoIdade(m.dias)}
            </p>
            {mostrarFalta && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.falta.map((f) => (
                  <span key={f} className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                    sem {f}
                  </span>
                ))}
                {m.quem === 'familia' && !m.figura_publica && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">aguardando a família</span>
                )}
              </div>
            )}
          </div>
        </div>
        <Link
          href={`/admin/memoriais/${m.id}`}
          className="inline-flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 border"
          style={{ color: '#C9A46A', borderColor: 'rgba(201,164,106,.5)', background: 'rgba(201,164,106,.14)' }}
        >
          <Pencil size={14} strokeWidth={1.5} />
          Abrir ficha
        </Link>
      </div>
    )
  }

  if (carregando) return <p className="text-[var(--tema-zinc-400)] text-sm">Carregando memoriais...</p>

  const gruposTipo = TIPOS_FALTA.filter((t) => faltas.has(t)).map((t) => ({
    tipo: t,
    itens: filtradas.filter((m) => m.falta.includes(t)),
  })).filter((g) => g.itens.length > 0)
  const truncou = visao === 'memorial' ? filtradas.length > limite : gruposTipo.some((g) => g.itens.length > limite)

  return (
    <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] items-start">
      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5 min-w-0">
        <h2 className="text-[15px] font-semibold text-white">Filtros</h2>
        <p className="text-xs text-[var(--tema-zinc-400)] mb-3">Mostre só o que quer cobrar agora.</p>

        <span className="block text-xs text-[var(--tema-zinc-400)] mb-1.5">Mostrar por</span>
        <div className="flex rounded-lg p-0.5 gap-0.5 bg-[var(--tema-zinc-800)]">
          {([
            ['tipo', 'Dado faltante', LayoutGrid],
            ['memorial', 'Memorial', List],
          ] as const).map(([id, rotulo, Icone]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVisao(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] ${
                visao === id ? 'bg-[var(--tema-zinc-600)] text-white' : 'text-[var(--tema-zinc-300)]'
              }`}
            >
              <Icone size={14} strokeWidth={1.5} />
              {rotulo}
            </button>
          ))}
        </div>

        <span className={ROTULO}>Dado que falta</span>
        {TIPOS_FALTA.map((t) => (
          <label key={t} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--tema-zinc-800)]">
            <span className="flex items-center text-sm text-white">
              <input
                type="checkbox"
                checked={faltas.has(t)}
                onChange={() => alternarFalta(t)}
                className="mr-2"
                style={{ accentColor: '#C9A46A' }}
              />
              {maiuscula(t)}
            </span>
            <span className="text-[11px] font-semibold px-1.5 rounded-full bg-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)]">
              {contagem[t]}
            </span>
          </label>
        ))}

        <label htmlFor="pend-quem" className={ROTULO}>Quem preenche</label>
        <select id="pend-quem" value={quem} onChange={(e) => setQuem(e.target.value as typeof quem)} className={CAMPO}>
          <option value="todos">Todos</option>
          <option value="familia">Aguardando a família</option>
          <option value="equipe">Equipe</option>
        </select>

        <label htmlFor="pend-parceiro" className={ROTULO}>Parceiro</label>
        <select id="pend-parceiro" value={parceiro} onChange={(e) => setParceiro(e.target.value)} className={CAMPO}>
          <option value="todos">Todos</option>
          {idsParceiros.map((id) => (
            <option key={id} value={id}>{nomeParceiro[id] || 'Parceiro'}</option>
          ))}
          <option value="sem">Sem parceiro (Central)</option>
        </select>

        <label htmlFor="pend-origem" className={ROTULO}>Origem do cadastro</label>
        <select id="pend-origem" value={origem} onChange={(e) => setOrigem(e.target.value as typeof origem)} className={CAMPO}>
          <option value="todas">Todas</option>
          <option value="cemiterio">Cemitério</option>
          <option value="parceiro">Parceiro</option>
          <option value="central">Central</option>
          <option value="outra">Outra / sem registro</option>
        </select>

        <label htmlFor="pend-idade" className={ROTULO}>Tempo desde o cadastro</label>
        <select id="pend-idade" value={idade} onChange={(e) => setIdade(e.target.value as typeof idade)} className={CAMPO}>
          <option value="todas">Qualquer</option>
          <option value="ate7">Até 7 dias</option>
          <option value="de8a14">8 a 14 dias</option>
          <option value="mais14">Mais de 14 dias</option>
          <option value="mais30">Mais de 30 dias</option>
        </select>

        <label htmlFor="pend-busca" className={ROTULO}>Buscar memorial</label>
        <input
          id="pend-busca"
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome do homenageado"
          autoComplete="off"
          className={CAMPO}
        />
      </div>

      <div className="min-w-0 space-y-3">
        <p className="text-xs text-[var(--tema-zinc-400)]">
          {filtradas.length} de {pendencias.length} memorial{pendencias.length === 1 ? '' : 'is'} com dado faltando.
          Memorial cadastrado em campo (botão direito no túmulo, pelo mapa do cemitério) nasce só com o nome.
        </p>

        {filtradas.length === 0 ? (
          <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5 text-sm text-[var(--tema-zinc-400)]">
            {pendencias.length === 0 ? 'Nenhum memorial com dado faltando. Tudo em dia.' : 'Nenhum memorial com esses filtros.'}
          </div>
        ) : visao === 'memorial' ? (
          <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5">
            {filtradas.slice(0, limite).map((m) => linha(m, true))}
          </div>
        ) : (
          gruposTipo.map((g) => (
            <div key={g.tipo} className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-400/10 text-amber-400">
                  <ClipboardList size={16} strokeWidth={1.5} />
                </span>
                <h3 className="text-sm font-semibold text-white">Sem {g.tipo}</h3>
                <span className="text-[11px] font-semibold px-1.5 rounded-full" style={{ background: 'rgba(201,164,106,.2)', color: '#C9A46A' }}>
                  {g.itens.length}
                </span>
              </div>
              {g.itens.slice(0, limite).map((m) => linha(m, false))}
            </div>
          ))
        )}

        {truncou && (
          <button
            type="button"
            onClick={() => setLimite((l) => l + POR_PAGINA)}
            className="text-sm rounded-lg px-3 py-1.5 border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] text-white hover:border-[#C9A46A]"
          >
            Mostrar mais {POR_PAGINA}
          </button>
        )}
      </div>
    </div>
  )
}
