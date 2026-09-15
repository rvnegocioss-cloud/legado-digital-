'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { CORES } from '@/lib/publicTheme'

// Grade uniforme, sem span variado -- achado real 2026-09-15 (2 rodadas):
// o mosaico assimétrico (blocos de 1-2 colunas/linhas) deixava buracos de
// verdade quando a quantidade de itens não fechava o padrão (com 5 fotos,
// sobravam 2 células vazias no fim -- CSS Grid não recua um bloco de
// tamanho maior pra preencher célula que ficou pequena demais). Todo item
// é 1:1, mesma posição/seção de sempre.

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
  // 4 colunas: mantém o tile no tamanho proporcional de antes (~290px na
  // largura de leitura), nem miniatura nem foto gigante ocupando a tela.
  // 2 colunas deixavam cada foto com ~600px -- "ficou imenso" (Rafael).
  // A última foto estica pra fechar a fileira quando a conta não bate
  // (5 fotos em 4 colunas: a 5ª ocupa as 4 células restantes), então nunca
  // sobra célula vazia em nenhuma quantidade.
  const [colunas, setColunas] = useState(4)

  useEffect(() => {
    function ajustarColunas() {
      const l = window.innerWidth
      setColunas(l < 620 ? 2 : l < 1100 ? 3 : 4)
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

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colunas}, 1fr)`,
          gap: 10,
        }}
      >
        {itens.map((url, i) => {
          const estilo = {
            aspectRatio: '1',
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
            background: 'rgba(6,16,24,0.97)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
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
                width: '100vw',
                height: '100vh',
                objectFit: 'contain',
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
                width: '100vw',
                height: '100vh',
                objectFit: 'contain',
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
