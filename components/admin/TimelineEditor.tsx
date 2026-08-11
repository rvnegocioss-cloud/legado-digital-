'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'

export interface TimelineEvento {
  year: string
  title: string
  description: string
}

const LIMITE_EVENTOS = 15

export function TimelineEditor({
  value,
  onChange,
}: {
  value: TimelineEvento[]
  onChange: (v: TimelineEvento[]) => void
}) {
  function atualizar(i: number, campo: keyof TimelineEvento, val: string) {
    onChange(value.map((ev, idx) => (idx === i ? { ...ev, [campo]: val } : ev)))
  }

  function remover(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  function mover(i: number, direcao: -1 | 1) {
    const alvo = i + direcao
    if (alvo < 0 || alvo >= value.length) return
    const nova = [...value]
    ;[nova[i], nova[alvo]] = [nova[alvo], nova[i]]
    onChange(nova)
  }

  function adicionar() {
    onChange([...value, { year: '', title: '', description: '' }])
  }

  return (
    <div>
      <label className="block text-xs text-[var(--tema-zinc-400)] mb-2">
        Linha do tempo ({value.length}/{LIMITE_EVENTOS})
      </label>

      {value.length === 0 && (
        <p className="text-xs text-[var(--tema-zinc-500)] mb-2">Nenhum evento adicionado ainda.</p>
      )}

      <div className="space-y-3">
        {value.map((ev, i) => (
          <div key={i} className="rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)]/50 p-3 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-20 shrink-0">
                <label htmlFor={`tl-ano-${i}`} className="block text-[10px] text-[var(--tema-zinc-400)] mb-1">
                  Ano
                </label>
                <input
                  id={`tl-ano-${i}`}
                  type="text"
                  placeholder="1980"
                  value={ev.year}
                  onChange={(e) => atualizar(i, 'year', e.target.value)}
                  className="w-full rounded border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-2 py-1.5 text-sm text-white placeholder-[var(--tema-zinc-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-600)]"
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`tl-titulo-${i}`} className="block text-[10px] text-[var(--tema-zinc-400)] mb-1">
                  Título do evento
                </label>
                <input
                  id={`tl-titulo-${i}`}
                  type="text"
                  placeholder="Nascimento"
                  value={ev.title}
                  onChange={(e) => atualizar(i, 'title', e.target.value)}
                  className="w-full rounded border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-2 py-1.5 text-sm text-white placeholder-[var(--tema-zinc-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-600)]"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 mt-5">
                <button
                  type="button"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover evento pra cima"
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--tema-zinc-500)] hover:text-white hover:bg-[var(--tema-zinc-700)] disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-600)]"
                >
                  <ChevronUp size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => mover(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label="Mover evento pra baixo"
                  className="w-6 h-6 flex items-center justify-center rounded text-[var(--tema-zinc-500)] hover:text-white hover:bg-[var(--tema-zinc-700)] disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-600)]"
                >
                  <ChevronDown size={14} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => remover(i)}
                  aria-label="Remover evento"
                  className="ml-1 text-xs text-[var(--tema-zinc-500)] hover:text-red-400"
                >
                  Remover
                </button>
              </div>
            </div>
            <div>
              <label htmlFor={`tl-desc-${i}`} className="block text-[10px] text-[var(--tema-zinc-400)] mb-1">
                Descrição
              </label>
              <textarea
                id={`tl-desc-${i}`}
                rows={2}
                placeholder="Detalhes desse momento"
                value={ev.description}
                onChange={(e) => atualizar(i, 'description', e.target.value)}
                className="w-full rounded border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-2 py-1.5 text-sm text-white placeholder-[var(--tema-zinc-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tema-zinc-600)]"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={adicionar}
        disabled={value.length >= LIMITE_EVENTOS}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium disabled:opacity-40 disabled:hover:text-blue-400"
      >
        + Adicionar evento
      </button>
    </div>
  )
}
