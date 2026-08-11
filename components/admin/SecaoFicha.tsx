import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SecaoFichaProps {
  titulo: string
  icon?: LucideIcon
  acao?: ReactNode
  className?: string
  children: ReactNode
  primeira?: boolean
}

// Header de seção (ícone + rótulo + ação opcional) + divisor — usado pra
// agrupar campos por assunto dentro de uma ficha densa (memorial, etc).
export function SecaoFicha({ titulo, icon: Icon, acao, className, children, primeira }: SecaoFichaProps) {
  return (
    <div className={`${primeira ? '' : 'mt-6 pt-6 border-t border-[var(--tema-zinc-800)]/70'} ${className || ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tema-zinc-400)]">
          {Icon && <Icon size={14} strokeWidth={1.5} className="text-[var(--tema-zinc-500)]" />}
          {titulo}
        </h3>
        {acao}
      </div>
      {children}
    </div>
  )
}
