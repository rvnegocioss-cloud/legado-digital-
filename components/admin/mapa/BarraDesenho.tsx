'use client'

export function BarraDesenho({
  texto,
  podeConcluir,
  onConcluir,
  onDesfazer,
  onCancelar,
}: {
  texto: string
  podeConcluir: boolean
  onConcluir: () => void
  onDesfazer: () => void
  onCancelar: () => void
}) {
  return (
    <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2 mb-3">
      <p className="text-xs text-emerald-300 mb-2">{texto}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!podeConcluir}
          onClick={onConcluir}
          className="text-xs px-2 py-1 rounded bg-emerald-700 text-branco-fixo hover:bg-emerald-600 disabled:opacity-40"
        >
          Concluir
        </button>
        <button type="button" onClick={onDesfazer} className="text-xs px-2 py-1 rounded border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)] hover:bg-[var(--tema-zinc-800)]">
          Desfazer ponto
        </button>
        <button type="button" onClick={onCancelar} className="text-xs px-2 py-1 rounded border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)] hover:bg-[var(--tema-zinc-800)]">
          Cancelar
        </button>
      </div>
    </div>
  )
}
