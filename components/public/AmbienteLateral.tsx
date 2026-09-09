'use client'

import { useEffect, useRef } from 'react'

export type Ambiente = 'pontos' | 'petalas' | 'ambos' | 'nenhum'
export type CorLateral = 'preto' | 'vinho' | 'marrom'

// Cor das faixas laterais. O centro da página nunca é afetado — quem manda lá
// é o tema do memorial (navy/verde/grafite), separado disto de propósito.
export const CORES_LATERAIS: Record<CorLateral, { hex: string; rgb: string; nome: string }> = {
  preto: { hex: '#0a0a0b', rgb: '10,10,11', nome: 'Preto' },
  vinho: { hex: '#23121a', rgb: '35,18,26', nome: 'Vinho' },
  marrom: { hex: '#241a12', rgb: '36,26,18', nome: 'Marrom' },
}

export const AMBIENTES: { id: Ambiente; nome: string }[] = [
  { id: 'pontos', nome: 'Pontos de luz' },
  { id: 'petalas', nome: 'Pétalas' },
  { id: 'ambos', nome: 'Os dois' },
  { id: 'nenhum', nome: 'Nenhum' },
]

// Largura do palco de conteúdo: a decoração só desenha FORA disso, nunca atrás
// do texto (regra fixa do projeto).
const LARGURA_PALCO = 1320
const LARGURA_MINIMA = 1240

interface Ponto {
  base: number
  y: number
  z: number
  r: number
  vel: number
  fase: number
  piscar: number
}

interface Petala {
  base: number
  y: number
  z: number
  tam: number
  vel: number
  giro: number
  velGiro: number
  balanco: number
  fase: number
  tom: number
}

export default function AmbienteLateral({
  ambiente = 'nenhum',
  cor = 'preto',
}: {
  ambiente?: Ambiente
  cor?: CorLateral
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (ambiente === 'nenhum') return
    const cv = ref.current
    if (!cv) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = cv.getContext('2d')
    if (!ctx) return

    let pontos: Ponto[] = []
    let petalas: Petala[] = []
    let mx = 0
    let my = 0
    let alvoX = 0
    let alvoY = 0
    let t = 0
    let raf = 0

    function dimensionar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv!.width = window.innerWidth * dpr
      cv!.height = window.innerHeight * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function semear() {
      pontos = []
      petalas = []
      const folga = (window.innerWidth - LARGURA_PALCO) / 2
      if (folga < 90) return

      if (ambiente === 'pontos' || ambiente === 'ambos') {
        for (let i = 0; i < 130; i++) {
          const esq = Math.random() < 0.5
          // z = profundidade: perto fica maior, mais claro e se move mais no
          // parallax; longe fica pequeno e apagado.
          const z = 0.25 + Math.random() * 0.75
          pontos.push({
            base: esq ? Math.random() * folga : window.innerWidth - Math.random() * folga,
            y: Math.random() * window.innerHeight,
            z,
            r: (0.6 + Math.random() * 1.7) * z,
            vel: (0.06 + Math.random() * 0.2) * z,
            fase: Math.random() * 6.28,
            piscar: 0.6 + Math.random() * 1.6,
          })
        }
      }

      if (ambiente === 'petalas' || ambiente === 'ambos') {
        for (let j = 0; j < 26; j++) {
          const esq = Math.random() < 0.5
          const z = 0.35 + Math.random() * 0.65
          petalas.push({
            base: esq ? Math.random() * folga : window.innerWidth - Math.random() * folga,
            y: Math.random() * window.innerHeight,
            z,
            tam: (12 + Math.random() * 12) * z,
            vel: (0.22 + Math.random() * 0.35) * z,
            giro: Math.random() * 6.28,
            velGiro: (Math.random() - 0.5) * 0.014,
            balanco: 14 + Math.random() * 26,
            fase: Math.random() * 6.28,
            tom: Math.random(),
          })
        }
      }
    }

    // Pétala desenhada na mão: duas curvas espelhadas fechando em ponta, com um
    // vinco no meio. Sem imagem — gira e muda de tamanho sem perder nitidez.
    function desenharPetala(x: number, y: number, tam: number, giro: number, alfa: number, tom: number) {
      const largura = tam * (0.42 + 0.3 * Math.abs(Math.cos(giro)))
      ctx!.save()
      ctx!.translate(x, y)
      ctx!.rotate(giro * 0.6)
      const g = ctx!.createLinearGradient(0, -tam / 2, 0, tam / 2)
      if (tom < 0.55) {
        g.addColorStop(0, `rgba(247,206,214,${alfa})`)
        g.addColorStop(1, `rgba(206,122,142,${alfa * 0.75})`)
      } else {
        g.addColorStop(0, `rgba(255,240,220,${alfa})`)
        g.addColorStop(1, `rgba(201,164,106,${alfa * 0.75})`)
      }
      ctx!.fillStyle = g
      ctx!.beginPath()
      ctx!.moveTo(0, -tam / 2)
      ctx!.bezierCurveTo(largura, -tam * 0.24, largura, tam * 0.26, 0, tam / 2)
      ctx!.bezierCurveTo(-largura, tam * 0.26, -largura, -tam * 0.24, 0, -tam / 2)
      ctx!.fill()
      ctx!.strokeStyle = `rgba(255,255,255,${alfa * 0.22})`
      ctx!.lineWidth = 0.7
      ctx!.beginPath()
      ctx!.moveTo(0, -tam / 2)
      ctx!.lineTo(0, tam / 2)
      ctx!.stroke()
      ctx!.restore()
    }

    function aoMover(e: MouseEvent) {
      alvoX = (e.clientX / window.innerWidth - 0.5) * 26
      alvoY = (e.clientY / window.innerHeight - 0.5) * 18
    }

    function quadro() {
      t += 0.016
      mx += (alvoX - mx) * 0.04
      my += (alvoY - my) * 0.04
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (const p of pontos) {
        p.y -= p.vel
        if (p.y < -10) p.y = window.innerHeight + 10
        const x = p.base + mx * p.z
        const y = p.y + my * p.z
        const brilho = (0.3 + 0.34 * Math.sin(t * p.piscar + p.fase)) * p.z
        const g = ctx!.createRadialGradient(x, y, 0, x, y, p.r * 5)
        g.addColorStop(0, `rgba(255,244,222,${brilho})`)
        g.addColorStop(0.35, `rgba(223,192,138,${brilho * 0.55})`)
        g.addColorStop(1, 'rgba(201,164,106,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(x, y, p.r * 5, 0, 6.2832)
        ctx!.fill()
      }

      for (const f of petalas) {
        f.y += f.vel
        f.giro += f.velGiro
        if (f.y > window.innerHeight + 30) f.y = -30
        const fx = f.base + Math.sin(t * 0.5 + f.fase) * f.balanco + mx * f.z
        const fy = f.y + my * f.z
        desenharPetala(fx, fy, f.tam, f.giro, 0.46 * f.z + 0.2, f.tom)
      }

      raf = requestAnimationFrame(quadro)
    }

    function iniciar() {
      dimensionar()
      semear()
    }

    iniciar()
    quadro()
    window.addEventListener('resize', iniciar)
    window.addEventListener('mousemove', aoMover)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', iniciar)
      window.removeEventListener('mousemove', aoMover)
    }
  }, [ambiente])

  const c = CORES_LATERAIS[cor] || CORES_LATERAIS.preto

  return (
    <>
      {/* Faixas laterais coloridas: puro gradiente no fundo da página, sem
          elemento cobrindo nada e sem cruzar atrás da coluna de conteúdo. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `linear-gradient(90deg,
            ${c.hex} 0px,
            ${c.hex} calc(50% - ${LARGURA_PALCO / 2 + 40}px),
            rgba(${c.rgb},0) calc(50% - ${LARGURA_PALCO / 2 - 40}px),
            rgba(${c.rgb},0) calc(50% + ${LARGURA_PALCO / 2 - 40}px),
            ${c.hex} calc(50% + ${LARGURA_PALCO / 2 + 40}px),
            ${c.hex} 100%)`,
        }}
        className="mem-faixas-laterais"
      />
      {ambiente !== 'nenhum' && (
        <canvas
          ref={ref}
          aria-hidden
          className="mem-ambiente-canvas"
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
        />
      )}
      <style>{`
        @media (max-width: ${LARGURA_MINIMA}px) {
          .mem-faixas-laterais, .mem-ambiente-canvas { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mem-ambiente-canvas { display: none; }
        }
      `}</style>
    </>
  )
}
