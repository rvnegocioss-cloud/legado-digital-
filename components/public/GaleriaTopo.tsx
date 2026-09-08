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

  if (total === 0) return null

  return (
    <div className="retrato-bloco">
      <div className="retrato-cabeca">
        <span>Fotos e vídeos</span>
        <button type="button" onClick={() => setVisor(0)}>ver tudo ({total})</button>
      </div>

      {videoCapa ? (
        <div className="retrato-moldura">
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
              className="retrato-play"
              style={{
                background: fotos[0]
                  ? `center/cover no-repeat url(${fotos[0]})`
                  : 'linear-gradient(135deg,#1b3040,#20384a)',
              }}
            >
              <span>&#9654;</span>
            </button>
          )}
        </div>
      ) : (
        fotos[0] && (
          <button type="button" onClick={() => setVisor(0)} className="retrato-moldura">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotos[0]} alt="" />
          </button>
        )
      )}

      {miniaturas.length > 0 && (
        <div className="retrato-tira">
          {miniaturas.map((url) => (
            <button key={url} type="button" onClick={() => setVisor(fotos.indexOf(url))} className="retrato-mini">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
            </button>
          ))}
          {restantes > 0 && (
            <button type="button" onClick={() => setVisor(miniaturas.length)} className="retrato-mini mais">
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
