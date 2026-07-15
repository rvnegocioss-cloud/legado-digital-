'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CORES } from '@/lib/publicTheme'

export function AcenderVela({ slug, velasIniciais }: { slug: string; velasIniciais: number }) {
  const [aceso, setAceso] = useState(false)
  const [contagem, setContagem] = useState(velasIniciais)
  const chaveLocal = `vela_${slug}`

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(chaveLocal)) {
      setAceso(true)
    }
  }, [chaveLocal])

  async function alternar() {
    const jaAcendeuAntes = typeof window !== 'undefined' && window.localStorage.getItem(chaveLocal)

    if (!aceso && !jaAcendeuAntes) {
      const { data, error } = await supabase.rpc('acender_vela', { p_slug: slug })
      if (!error) {
        window.localStorage.setItem(chaveLocal, '1')
        setContagem(typeof data === 'number' ? data : contagem + 1)
      }
    }

    setAceso(!aceso)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Filtro SVG de turbulência — distorce a chama de forma orgânica, zero JS */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="vela-turbulencia">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.09" numOctaves={2} seed={4} result="turb">
              <animate attributeName="baseFrequency" values="0.03 0.09;0.045 0.11;0.03 0.09" dur="2.4s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="turb" scale={aceso ? 4 : 0} />
          </filter>
        </defs>
      </svg>

      <button
        onClick={alternar}
        aria-label={aceso ? 'Apagar a vela' : 'Acender uma vela'}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}
      >
        <div style={{ position: 'relative', width: 44, height: 64, margin: '0 auto' }}>
          {/* Glow externo */}
          {aceso && (
            <div
              className="vela-glow"
              style={{
                position: 'absolute',
                left: '50%',
                top: 6,
                transform: 'translateX(-50%)',
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'radial-gradient(closest-side, rgba(255,180,80,0.55), transparent)',
                filter: 'blur(6px)',
              }}
            />
          )}

          {/* Chama */}
          <div
            className={aceso ? 'vela-nucleo' : ''}
            style={{
              position: 'absolute',
              left: '50%',
              top: 4,
              transform: 'translateX(-50%) rotate(180deg)',
              width: aceso ? 20 : 10,
              height: aceso ? 28 : 12,
              borderRadius: '50% 50% 50% 0',
              background: aceso
                ? 'radial-gradient(circle at 65% 35%, #fff7d6 0%, #ffd27a 35%, #ff9d3f 65%, #C9A46A 100%)'
                : '#3a3226',
              filter: aceso ? 'url(#vela-turbulencia) drop-shadow(0 0 8px rgba(255,170,80,0.7))' : 'none',
              transition: 'width 0.3s ease, height 0.3s ease, background 0.3s ease',
            }}
          />

          {/* Pavio */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 30,
              transform: 'translateX(-50%)',
              width: 2,
              height: 8,
              background: '#2a221a',
            }}
          />

          {/* Corpo da vela */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translateX(-50%)',
              width: 30,
              height: 34,
              borderRadius: '3px 3px 4px 4px',
              background: 'linear-gradient(180deg, #F5F2EB, #d8d2c4)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          />
        </div>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: CORES.textoFraco }}>
          {aceso ? 'Vela acesa' : 'Acender uma vela'}
        </div>
        <div style={{ fontSize: 12, color: CORES.dourado, marginTop: 2 }}>
          {contagem} {contagem === 1 ? 'vela acesa por quem visitou' : 'velas acesas por quem visitou'}
        </div>
      </div>
    </div>
  )
}
