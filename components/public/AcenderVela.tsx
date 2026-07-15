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
        {/* Containing block raiz: relative + tamanho explícito. Todo "bottom" dos filhos se refere a este box. */}
        <div style={{ position: 'relative', width: 60, height: 88, margin: '0 auto' }}>

          {/* Halo — só anima opacity, então translateX inline aqui é seguro (não colide com keyframe) */}
          {aceso && (
            <div
              className="vela-glow-ambiente"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 20,
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

          {/* Corpo da vela — altura explícita (40), sem animation, translateX inline seguro. Containing block do pavio. */}
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
          >
            {/* Pavio — bottom:100% do corpo (encosta no topo dele). Altura explícita (10). Containing block da brasa/chama. */}
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                marginLeft: -1,
                width: 2,
                height: 10,
                background: '#2a221a',
              }}
            >
              {/* Brasa (apagada) — bottom:100% do pavio = na ponta dele */}
              {!aceso && (
                <div
                  className="vela-brasa"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    marginLeft: -2,
                    width: 4,
                    height: 4,
                  }}
                />
              )}

              {/* Chama — bottom:50% do pavio, sobe a partir da metade dele.
                  Centralizada por marginLeft (nunca transform): a classe roda um
                  keyframe que anima transform/scale, e um transform inline seria
                  sobrescrito pela animação — era exatamente o bug da chama pulando
                  pro lado errado quando acendia. */}
              {aceso && (
                <div
                  className="vela-chama-intensidade"
                  style={{
                    position: 'absolute',
                    bottom: '50%',
                    left: '50%',
                    marginLeft: -8,
                    width: 16,
                    height: 16,
                  }}
                >
                  <div className="vela-chama" style={{ position: 'absolute', inset: 0 }} />
                </div>
              )}
            </div>
          </div>
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
