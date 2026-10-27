'use client'

import { useEffect, useRef } from 'react'

/** Bolinha branca no meio de um trecho de rua: arrastar curva; duplo clique volta reto. */
export default function BolinhaCurva({ travada, onReta }: { travada: boolean; onReta: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onReta)
  useEffect(() => {
    cb.current = onReta
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const f = (e: Event) => {
      e.stopPropagation()
      cb.current()
    }
    el.addEventListener('dblclick', f)
    return () => el.removeEventListener('dblclick', f)
  }, [])
  return (
    <div
      ref={ref}
      title={travada ? 'Rua travada' : 'Arraste para curvar o trecho (duplo clique volta reto)'}
      style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#fff',
        border: '2px solid #000',
        cursor: travada ? 'not-allowed' : 'grab',
        opacity: travada ? 0.5 : 1,
      }}
    />
  )
}
