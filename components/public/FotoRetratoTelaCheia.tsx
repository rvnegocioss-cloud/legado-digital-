'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'

interface Props {
  src: string
  alt: string
  style?: CSSProperties
}

// Retrato do topo do memorial: clicar abre a foto na tela inteira, mesmo
// padrão dos mapas (Fullscreen API onde o aparelho aceita, position:fixed
// 100dvh como reforço -- iOS não deixa um <div> pedir tela cheia).
export default function FotoRetratoTelaCheia({ src, alt, style }: Props) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!aberto) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    containerRef.current?.requestFullscreen?.().catch(() => {})
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    function aoMudarFullscreen() {
      if (!document.fullscreenElement) setAberto(false)
    }
    window.addEventListener('keydown', tecla)
    document.addEventListener('fullscreenchange', aoMudarFullscreen)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
      document.removeEventListener('fullscreenchange', aoMudarFullscreen)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [aberto])

  const botaoTopo: CSSProperties = {
    background: 'none',
    border: 0,
    color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 4px',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Ver foto de ${alt} em tela cheia`}
        style={{ all: 'unset', display: 'block', width: '100%', height: '100%', cursor: 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={style} />
      </button>

      {aberto && (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${alt}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false)
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            width: '100vw',
            height: '100dvh',
            background: 'rgba(4,10,15,0.96)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
            }}
          >
            <button type="button" onClick={() => setAberto(false)} style={botaoTopo}>
              ← Voltar
            </button>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" style={botaoTopo}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setAberto(false)
            }}
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px 16px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
          </div>
        </div>
      )}
    </>
  )
}
