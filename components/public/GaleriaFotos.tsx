'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { CORES } from '@/lib/publicTheme'

export function GaleriaFotos({ fotos }: { fotos: string[] }) {
  const [aberta, setAberta] = useState<number | null>(null)

  useEffect(() => {
    if (aberta === null) return
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberta(null)
      if (e.key === 'ArrowRight') setAberta((i) => (i === null ? i : (i + 1) % fotos.length))
      if (e.key === 'ArrowLeft') setAberta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length))
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, fotos.length])

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {fotos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`Foto ${i + 1}`}
            loading="lazy"
            decoding="async"
            onClick={() => setAberta(i)}
            className="mem-galeria-item"
            style={{
              width: '100%',
              aspectRatio: '1/1',
              objectFit: 'cover',
              borderRadius: 10,
              border: `1px solid ${CORES.douradoBorda}`,
              cursor: 'zoom-in',
            }}
          />
        ))}
      </div>

      {aberta !== null && (
        <div
          onClick={() => setAberta(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8,23,34,0.94)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <button
            onClick={() => setAberta(null)}
            aria-label="Fechar"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${CORES.douradoBorda}`,
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CORES.textoForte,
              cursor: 'pointer',
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          {fotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setAberta((aberta - 1 + fotos.length) % fotos.length) }}
                aria-label="Foto anterior"
                style={{
                  position: 'absolute',
                  left: 16,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${CORES.douradoBorda}`,
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CORES.textoForte,
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setAberta((aberta + 1) % fotos.length) }}
                aria-label="Próxima foto"
                style={{
                  position: 'absolute',
                  right: 16,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${CORES.douradoBorda}`,
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CORES.textoForte,
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotos[aberta]}
            alt={`Foto ${aberta + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 6,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              bottom: 20,
              fontSize: 12,
              color: CORES.textoFraco,
              letterSpacing: 1,
            }}
          >
            {aberta + 1} / {fotos.length}
          </div>
        </div>
      )}
    </>
  )
}
