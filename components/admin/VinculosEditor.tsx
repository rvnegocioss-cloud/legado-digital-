'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const SUGESTOES = ['Esposo', 'Esposa', 'Pai', 'Mãe', 'Filho', 'Filha', 'Avô', 'Avó', 'Irmão', 'Irmã', 'Amigo', 'Amiga']

// Badges de vínculo/papel (ex: "Pai", "Avô") que aparecem perto do nome na
// página pública — homenagens.vinculos, array de texto livre.
export function VinculosEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [novo, setNovo] = useState('')

  function adicionar(texto: string) {
    const limpo = texto.trim()
    if (!limpo || value.includes(limpo)) return
    onChange([...value, limpo])
    setNovo('')
  }

  function remover(texto: string) {
    onChange(value.filter((v) => v !== texto))
  }

  const sugestoesRestantes = SUGESTOES.filter((s) => !value.includes(s))

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 pl-2.5 pr-1.5 py-1 text-xs text-zinc-200"
            >
              {v}
              <button
                type="button"
                onClick={() => remover(v)}
                aria-label={`Remover ${v}`}
                className="text-zinc-500 hover:text-red-400"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar(novo)
            }
          }}
          placeholder="Ex: Pai, Avô..."
          className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500"
        />
        <button
          type="button"
          onClick={() => adicionar(novo)}
          className="shrink-0 px-3 rounded-md border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700"
        >
          Adicionar
        </button>
      </div>
      {sugestoesRestantes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {sugestoesRestantes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-full px-2 py-0.5"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
