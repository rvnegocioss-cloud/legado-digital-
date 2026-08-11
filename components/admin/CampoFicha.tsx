import { ReactNode } from 'react'

interface CampoFichaProps {
  label: string
  htmlFor?: string
  hint?: string
  className?: string
  children: ReactNode
}

// Wrapper de campo padrão pra fichas densas (Central/Portal do Parceiro) —
// label com contraste garantido (zinc-400, não zinc-500) acima do controle.
export function CampoFicha({ label, htmlFor, hint, className, children }: CampoFichaProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs text-[var(--tema-zinc-400)] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[var(--tema-zinc-500)] mt-1">{hint}</p>}
    </div>
  )
}
