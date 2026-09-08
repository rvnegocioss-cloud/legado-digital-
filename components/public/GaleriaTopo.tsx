'use client'

import { useState } from 'react'

// Galeria compacta no topo do memorial, ao lado do rosto: um destaque grande
// (o vídeo, quando existe; senão a primeira foto) e miniaturas embaixo. Clicar
// leva pra seção completa de Fotos e Vídeos, que continua existindo igual.
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

  const totalVideos = (videoCapa ? 1 : 0) + videosExtras.length
  const total = fotos.length + totalVideos
  if (total === 0) return null

  const miniaturas = fotos.slice(0, 3)
  const restantes = total - miniaturas.length - (videoCapa ? 1 : 0)

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
        <a href="#galeria" style={{ color: '#7a8a96', fontSize: 11, letterSpacing: 0, textDecoration: 'none' }}>
          ver tudo ({total})
        </a>
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
          <a href="#galeria" style={{ display: 'block', marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotos[0]}
              alt=""
              style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
          </a>
        )
      )}

      {miniaturas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {miniaturas.map((url) => (
            <a key={url} href="#galeria" style={{ display: 'block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, display: 'block' }}
              />
            </a>
          ))}
          {restantes > 0 && (
            <a
              href="#galeria"
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                background: 'rgba(201,164,106,0.14)',
                color: 'var(--mem-dourado, #C9A46A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                textDecoration: 'none',
              }}
            >
              +{restantes}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
