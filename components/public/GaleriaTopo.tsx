'use client'

import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// Galeria compacta no topo do memorial, ao lado do rosto: um destaque grande
// (o vídeo, quando existe; senão a primeira foto) e miniaturas embaixo. Clicar
// abre a foto ou o vídeo em TELA CHEIA aqui mesmo -- nunca joga a pessoa pra
// outra seção da página.
function ehVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
}
export default function GaleriaTopo({
  fotos,
  videoCapa,
  videosExtras,
  ehYoutube,
}: {
  fotos: string[]
  videoCapa: string | null
  videosExtras: string[]
  ehYoutube: boolean
}) {
  const [aberto, setAberto] = useState(false)
  // Índice do item aberto em tela cheia. Antes as miniaturas eram atalho pra
  // seção lá de baixo -- agora abrem aqui mesmo, no topo.
  const [visor, setVisor] = useState<number | null>(null)

  const totalVideos = (videoCapa ? 1 : 0) + videosExtras.length
  const total = fotos.length + totalVideos
  if (total === 0) return null

  const miniaturas = fotos.slice(0, 3)
  const restantes = total - miniaturas.length - (videoCapa ? 1 : 0)

  // Tudo o que o visor percorre com as setas: os extras entram depois das fotos.
  const itens = [...fotos, ...videosExtras]

  useEffect(() => {
    if (visor === null) return
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisor(null)
      if (e.key === 'ArrowRight') setVisor((i) => (i === null ? i : (i + 1) % itens.length))
      if (e.key === 'ArrowLeft') setVisor((i) => (i === null ? i : (i - 1 + itens.length) % itens.length))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [visor, itens.length])

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--mem-dourado-borda, rgba(201,164,106,0.18))',
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          fontSize: 10.5,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: 'var(--mem-dourado, #C9A46A)',
        }}
      >
        <span>Fotos e vídeos</span>
        <button
          type="button"
          onClick={() => setVisor(0)}
          style={{ color: '#7a8a96', fontSize: 11, letterSpacing: 0, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ver tudo ({total})
        </button>
      </div>

      {videoCapa ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: '#000' }}>
          {aberto ? (
            ehYoutube ? (
              <iframe
                src={videoCapa}
                title="Vídeo do memorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <video src={videoCapa} controls autoPlay style={{ width: '100%', height: '100%', background: '#000' }} />
            )
          ) : (
            <button
              type="button"
              onClick={() => setAberto(true)}
              aria-label="Reproduzir vídeo"
              style={{
                width: '100%',
                height: '100%',
                border: 0,
                cursor: 'pointer',
                background: fotos[0]
                  ? `center/cover no-repeat url(${fotos[0]})`
                  : 'linear-gradient(135deg,#1b3040,#20384a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'rgba(201,164,106,0.92)',
                  color: '#0B1D2A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                }}
              >
                ▶
              </span>
            </button>
          )}
        </div>
      ) : (
        fotos[0] && (
          <button
            type="button"
            onClick={() => setVisor(0)}
            style={{ display: 'block', marginBottom: 8, padding: 0, border: 0, background: 'none', width: '100%', cursor: 'zoom-in' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotos[0]}
              alt=""
              style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
          </button>
        )
      )}

      {miniaturas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {miniaturas.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setVisor(fotos.indexOf(url))}
              style={{ display: 'block', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, display: 'block' }}
              />
            </button>
          ))}
          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setVisor(miniaturas.length)}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                border: 0,
                background: 'rgba(201,164,106,0.14)',
                color: 'var(--mem-dourado, #C9A46A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              +{restantes}
            </button>
          )}
        </div>
      )}

      {visor !== null && itens[visor] && (
        <div
          onClick={() => setVisor(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,16,24,0.97)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setVisor(null)}
            aria-label="Fechar"
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(201,164,106,0.3)',
              color: '#F5F2EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          {itens.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setVisor((visor - 1 + itens.length) % itens.length) }}
                aria-label="Anterior"
                style={{
                  position: 'absolute', left: 16, zIndex: 2, width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,164,106,0.3)',
                  color: '#F5F2EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setVisor((visor + 1) % itens.length) }}
                aria-label="Próxima"
                style={{
                  position: 'absolute', right: 16, zIndex: 2, width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,164,106,0.3)',
                  color: '#F5F2EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </>
          )}

          {ehVideoUrl(itens[visor]) ? (
            <video
              src={itens[visor]}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100vw', height: '100vh', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={itens[visor]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100vw', height: '100vh', objectFit: 'contain' }}
            />
          )}

          <div style={{ position: 'absolute', bottom: 18, fontSize: 12, color: '#7a8a96', letterSpacing: 1 }}>
            {visor + 1} / {itens.length}
          </div>
        </div>
      )}
    </div>
  )
}
