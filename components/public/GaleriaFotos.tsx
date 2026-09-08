'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { CORES } from '@/lib/publicTheme'

// Padrão de mosaico assimétrico (alguns itens ocupam 2 colunas/2 linhas) —
// repete em ciclo se a galeria tiver mais fotos que o padrão.
const MOSAICO_A = [
  { col: 2, row: 2 }, { col: 1, row: 1 }, { col: 1, row: 1 }, { col: 1, row: 2 },
  { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 1 }, { col: 1, row: 1 },
  { col: 1, row: 1 }, { col: 1, row: 2 },
]
const MOSAICO_B = [
  { col: 1, row: 1 }, { col: 2, row: 2 }, { col: 1, row: 1 }, { col: 1, row: 1 },
  { col: 1, row: 2 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 1 },
  { col: 1, row: 2 }, { col: 1, row: 1 },
]

// Galeria unificada: foto e vídeo no mesmo mosaico e no mesmo pop-up, em vez
// de vídeo numa seção separada lá embaixo. `videos` é opcional -- quem já
// chamava o componente só com fotos continua funcionando igual.
function ehVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
}

export function GaleriaFotos({ fotos, videos = [] }: { fotos: string[]; videos?: string[] }) {
  // Vídeo primeiro: é o que a família mais quer mostrar, e no mosaico ele
  // ocupa o bloco grande de abertura.
  const itens = [...videos, ...fotos]
  const [aberta, setAberta] = useState<number | null>(null)
  const [variacao, setVariacao] = useState<'a' | 'b'>('a')
  const [colunas, setColunas] = useState(4)

  useEffect(() => {
    function ajustarColunas() {
      setColunas(window.innerWidth < 768 ? 2 : 4)
    }
    ajustarColunas()
    window.addEventListener('resize', ajustarColunas)
    return () => window.removeEventListener('resize', ajustarColunas)
  }, [])

  useEffect(() => {
    if (aberta === null) return
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberta(null)
      if (e.key === 'ArrowRight') setAberta((i) => (i === null ? i : (i + 1) % itens.length))
      if (e.key === 'ArrowLeft') setAberta((i) => (i === null ? i : (i - 1 + itens.length) % itens.length))
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, itens.length])

  const padrao = variacao === 'a' ? MOSAICO_A : MOSAICO_B

  return (
    <>
      {itens.length > 3 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 12 }}>
          {(['a', 'b'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariacao(v)}
              style={{
                background: variacao === v ? CORES.dourado : 'transparent',
                color: variacao === v ? CORES.fundoBase : CORES.dourado,
                border: `1px solid ${CORES.dourado}`,
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 11,
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              MOSAICO {v.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colunas}, 1fr)`,
          gridAutoRows: colunas === 2 ? 78 : 100,
          gap: 8,
        }}
      >
        {itens.map((url, i) => {
          const span = padrao[i % padrao.length]
          const col = Math.min(span.col, colunas)
          const estilo = {
            gridColumn: `span ${col}`,
            gridRow: `span ${span.row}`,
            width: '100%',
            height: '100%',
            objectFit: 'cover' as const,
            borderRadius: 6,
            border: `1px solid ${CORES.douradoBorda}`,
            cursor: 'zoom-in' as const,
          }

          if (ehVideo(url)) {
            return (
              <div
                key={i}
                onClick={() => setAberta(i)}
                className="mem-galeria-item"
                style={{ ...estilo, position: 'relative', overflow: 'hidden', background: '#000' }}
              >
                {/* preload metadata: carrega só o primeiro quadro como capa,
                    nunca o vídeo inteiro só pra montar o mosaico */}
                <video src={url} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(201,164,106,0.92)',
                      color: CORES.fundoBase,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                    }}
                  >
                    ▶
                  </span>
                </span>
              </div>
            )
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Foto ${i + 1}`}
              loading="lazy"
              decoding="async"
              onClick={() => setAberta(i)}
              className="mem-galeria-item"
              style={estilo}
            />
          )
        })}
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

          {itens.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setAberta((aberta - 1 + itens.length) % itens.length) }}
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
                onClick={(e) => { e.stopPropagation(); setAberta((aberta + 1) % itens.length) }}
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

          {ehVideo(itens[aberta]) ? (
            <video
              src={itens[aberta]}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '88vh',
                borderRadius: 6,
                background: '#000',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itens[aberta]}
              alt={`Item ${aberta + 1}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '88vh',
                objectFit: 'contain',
                borderRadius: 6,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              bottom: 20,
              fontSize: 12,
              color: CORES.textoFraco,
              letterSpacing: 1,
            }}
          >
            {aberta + 1} / {itens.length}
          </div>
        </div>
      )}
    </>
  )
}
