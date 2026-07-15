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
      <button
        onClick={alternar}
        aria-label={aceso ? 'Apagar a vela' : 'Acender uma vela'}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}
      >
        <div style={{ position: 'relative', width: 60, height: 88, margin: '0 auto' }}>
          {/* Luz ambiente ao redor, só quando acesa */}
          {aceso && (
            <div
              className="vela-glow-ambiente"
              style={{
                position: 'absolute',
                left: '50%',
                top: 6,
                transform: 'translateX(-50%)',
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,160,70,0.55) 0%, transparent 70%)',
                filter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Pavio + chama */}
          <div style={{ position: 'absolute', left: '50%', bottom: 34, transform: 'translateX(-50%)' }}>
            {/* Pavio */}
            <div style={{ width: 2, height: 10, background: '#2a221a', margin: '0 auto' }} />

            {/* Brasa (ponta do pavio, sempre visível) */}
            {!aceso && (
              <div className="vela-brasa" style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4 }} />
            )}

            {/* Chama, só quando acesa */}
            {aceso && (
              <div
                className="vela-chama-intensidade"
                style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16 }}
              >
                <div className="vela-chama" style={{ position: 'absolute', inset: 0 }} />
              </div>
            )}
          </div>

          {/* Corpo da vela */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              transform: 'translateX(-50%)',
              width: 32,
              height: 40,
              borderRadius: '4px 10px 2px 2px',
              background: 'radial-gradient(circle at 30% 0%, #fdfbf3 15%, #e4ddc8 60%, #c9bfa1 100%)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.25)',
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
