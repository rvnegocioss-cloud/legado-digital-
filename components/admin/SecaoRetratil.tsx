'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function SecaoRetratil({
  titulo,
  abertoPorPadrao = false,
  children,
}: {
  titulo: string
  abertoPorPadrao?: boolean
  children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(abertoPorPadrao)

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        <span>{titulo}</span>
        {aberto ? <ChevronDown size={16} className="shrink-0" /> : <ChevronRight size={16} className="shrink-0" />}
      </button>
      {aberto && <div className="mt-3">{children}</div>}
    </div>
  )
}
