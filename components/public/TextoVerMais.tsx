'use client'

import { useEffect, useRef, useState } from 'react'

// Biografia longa não pode estourar o componente nem ser cortada no meio sem
// aviso: fica com altura limitada e um "ver mais" que abre o resto. O botão só
// aparece quando o texto realmente não coube — medido no elemento, não chutado
// por contagem de caracteres (fonte, largura e zoom mudam o resultado).
export default function TextoVerMais({
  children,
  alturaFechada = 320,
}: {
  children: React.ReactNode
  alturaFechada?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [estoura, setEstoura] = useState(false)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function medir() {
      if (!el) return
      setEstoura(el.scrollHeight > alturaFechada + 24)
    }

    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [alturaFechada, children])

  const fechado = estoura && !aberto

  return (
    <div>
      <div
        ref={ref}
        style={{
          maxHeight: fechado ? alturaFechada : undefined,
          overflow: fechado ? 'hidden' : undefined,
          // Desbotado só na última faixa, pra ficar claro que continua — nunca
          // um corte seco no meio da linha.
          maskImage: fechado ? 'linear-gradient(180deg, #000 72%, transparent 100%)' : undefined,
          WebkitMaskImage: fechado ? 'linear-gradient(180deg, #000 72%, transparent 100%)' : undefined,
        }}
      >
        {children}
      </div>

      {estoura && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          style={{
            marginTop: 10,
            padding: '7px 14px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--mem-dourado, #C9A46A)',
            color: 'var(--mem-dourado-claro, #dfc08a)',
            fontFamily: 'inherit',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {aberto ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  )
}
