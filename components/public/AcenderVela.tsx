'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CORES } from '@/lib/publicTheme'

const TAMANHO_PAREDE = 45

// Seed determinística por índice (nunca Math.random() no render — evita
// descompasso entre servidor e cliente na hidratação do componente).
function seedPorIndice(i: number) {
  return ((i * 47 + 13) % 100) / 100
}

interface Voo {
  top: number
  left: number
  fase: 'inicio' | 'fim'
}

export function AcenderVela({ slug, velasIniciais }: { slug: string; velasIniciais: number }) {
  // A vela principal fica SEMPRE acesa (representa a chama coletiva) — não tem
  // mais estado "apagada"/toggle. Clicar no botão acende uma vela NOVA na
  // parede (a sua contribuição), nunca apaga a principal.
  const [contagem, setContagem] = useState(velasIniciais)
  const [paredeAcesas, setParedeAcesas] = useState(() => Math.min(velasIniciais, TAMANHO_PAREDE))
  const [indiceRecemAceso, setIndiceRecemAceso] = useState<number | null>(null)
  const [voo, setVoo] = useState<Voo | null>(null)
  const [pulsoPrincipal, setPulsoPrincipal] = useState(false)
  const [jaAcendi, setJaAcendi] = useState(false)
  const chaveLocal = `vela_${slug}`

  const secaoRef = useRef<HTMLDivElement | null>(null)
  const chamaPrincipalRef = useRef<HTMLDivElement | null>(null)
  const paredeRefs = useRef<Record<number, HTMLDivElement | null>>({})

  function pulsarPrincipal() {
    setPulsoPrincipal(true)
    setTimeout(() => setPulsoPrincipal(false), 500)
  }

  function iniciarVoo(indiceAlvo: number) {
    const secao = secaoRef.current
    const origem = chamaPrincipalRef.current
    const destino = paredeRefs.current[indiceAlvo]

    pulsarPrincipal()

    if (!secao || !origem || !destino) {
      // Sem medida possível (refs ainda não montaram) — acende direto, sem animação de voo.
      setParedeAcesas((p) => Math.max(p, indiceAlvo + 1))
      setIndiceRecemAceso(indiceAlvo)
      setTimeout(() => setIndiceRecemAceso(null), 700)
      return
    }

    const rSecao = secao.getBoundingClientRect()
    const rOrigem = origem.getBoundingClientRect()
    const rDestino = destino.getBoundingClientRect()

    setVoo({
      top: rOrigem.top - rSecao.top,
      left: rOrigem.left - rSecao.left + rOrigem.width / 2,
      fase: 'inicio',
    })

    setTimeout(() => {
      setVoo({
        top: rDestino.top - rSecao.top,
        left: rDestino.left - rSecao.left + rDestino.width / 2,
        fase: 'fim',
      })
    }, 20)

    setTimeout(() => {
      setVoo(null)
      setParedeAcesas((p) => Math.max(p, indiceAlvo + 1))
      setIndiceRecemAceso(indiceAlvo)
      setTimeout(() => setIndiceRecemAceso(null), 700)
    }, 900)
  }

  async function acender() {
    const jaAcendeuAntes = typeof window !== 'undefined' && window.localStorage.getItem(chaveLocal)

    if (jaAcendeuAntes) {
      // Já contou antes (regra: contador nunca soma 2x pro mesmo visitante) —
      // só um aceno visual na chama principal, sem mudar parede/contador.
      pulsarPrincipal()
      return
    }

    const { data, error } = await supabase.rpc('acender_vela', { p_slug: slug })
    if (error) return

    window.localStorage.setItem(chaveLocal, '1')
    setJaAcendi(true)
    const novoTotal = typeof data === 'number' ? data : contagem + 1
    setContagem(novoTotal)

    if (paredeAcesas < TAMANHO_PAREDE) {
      iniciarVoo(paredeAcesas)
    } else {
      pulsarPrincipal()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative' }} ref={secaoRef}>
      {/* Mural de velas votivas — velas já acesas por quem visitou antes */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '18px 10px',
          borderRadius: 10,
          background: 'radial-gradient(ellipse at center 35%, rgba(201,164,106,0.09), rgba(201,164,106,0.02) 72%)',
          border: `1px solid ${CORES.douradoBorda}`,
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 6px' }}>
          {Array.from({ length: TAMANHO_PAREDE }, (_, i) => {
            const estaAcesa = i < paredeAcesas
            const seed = seedPorIndice(i)
            const acabouDeAcender = i === indiceRecemAceso
            return (
              <div
                key={i}
                ref={(el) => {
                  paredeRefs.current[i] = el
                }}
                style={{ position: 'relative', width: 16, height: 26, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              >
                {/* Copo/cuia da vela votiva */}
                <div
                  style={{
                    width: 10,
                    height: 12,
                    borderRadius: '1px 1px 4px 4px',
                    background: 'linear-gradient(180deg, rgba(201,164,106,0.15), rgba(160,124,72,0.32))',
                    border: `1px solid ${CORES.douradoBorda}`,
                    boxShadow: estaAcesa ? '0 0 8px 1px rgba(255,170,80,0.35)' : 'none',
                  }}
                />
                {estaAcesa && (
                  <div
                    className={acabouDeAcender ? 'vela-parede-acender' : undefined}
                    style={{
                      position: 'absolute',
                      bottom: 9,
                      left: '50%',
                      transform: 'translateX(-50%) skewX(50deg) rotate(45deg) scale(0.5, 4.5) rotate(15deg) skewX(-50deg)',
                      transformOrigin: '50% 100%',
                      width: 5,
                      height: 5,
                      borderRadius: '0 1em 1em 1em',
                      background: 'radial-gradient(circle at 50% 15%, #fff6d0 0%, #ffd35c 30%, #ff9a3c 60%, #e2632f 85%, transparent 100%)',
                      filter: 'drop-shadow(0 0 4px rgba(255,150,60,0.7))',
                      animation: `vela-flicker-flame ${(2 + seed * 1.4).toFixed(2)}s ease-in-out ${(-seed * 2).toFixed(2)}s infinite`,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chama voando da vela principal até a vela da parede recém-acesa */}
      {voo && (
        <div
          className="vela-voo"
          style={{
            position: 'absolute',
            top: voo.top,
            left: voo.left,
            width: 12,
            height: 16,
            transform: `translate(-50%,-100%) scale(${voo.fase === 'fim' ? 0.35 : 1})`,
            opacity: voo.fase === 'fim' ? 0.15 : 1,
            borderRadius: '0 1em 1em 1em',
            background: 'radial-gradient(circle at 50% 15%, #fff6d0 0%, #ffd35c 30%, #ff9a3c 60%, #e2632f 85%, transparent 100%)',
            boxShadow: '0 0 14px 4px rgba(255,170,80,0.55)',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />
      )}

      {/* Vela principal — sempre acesa, representa a chama coletiva. Não é botão:
          o clique fica só no texto/botão abaixo, igual ao mockup. */}
      <div style={{ position: 'relative', width: 60, height: 88, margin: '0 auto' }}>
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
          <div
            ref={chamaPrincipalRef}
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
            {/* Chama real (vídeo de fogo, fundo preto removido via mix-blend-mode screen) —
                sempre visível, a vela principal nunca apaga. */}
            <video
              className={pulsoPrincipal ? 'vela-parede-acender' : undefined}
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: 'absolute',
                bottom: '35%',
                left: '50%',
                marginLeft: -22,
                width: 44,
                height: 66,
                objectFit: 'cover',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }}
            >
              <source src="/videos/vela-chama-teste.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      <button
        onClick={acender}
        style={{
          marginTop: 8,
          background: 'transparent',
          border: `1px solid ${CORES.dourado}`,
          color: CORES.dourado,
          padding: '10px 24px',
          fontSize: 13,
          letterSpacing: 1,
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        {jaAcendi ? 'VELA ACESA' : 'ACENDER UMA VELA'}
      </button>

      <div style={{ fontSize: 12, color: CORES.dourado, marginTop: 2, textAlign: 'center' }}>
        {contagem} {contagem === 1 ? 'vela acesa por quem visitou' : 'velas acesas por quem visitou'}
      </div>
    </div>
  )
}
