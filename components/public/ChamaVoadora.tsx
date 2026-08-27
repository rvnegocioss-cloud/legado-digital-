'use client'

import { useEffect, useRef } from 'react'
import { SPRITE_CHAMA_SRC, CHAMA_QUADRO_LARGURA, CHAMA_QUADRO_ALTURA, carregarSpriteComAlfa, quadroDaChama } from '@/lib/chamaAlfa'

// A chama que "voa" do castiçal até a parede. Antes era o mesmo teardrop CSS
// (border-radius + rotate) usado na vela principal antiga; como a vela e a
// parede agora desenham a chama de verdade (sprite), manter o teardrop na
// transição faria ela mudar de formato no meio do voo. A posição (top/left)
// continua sendo animada por transição CSS no elemento pai — este componente
// só desenha o quadro atual da chama dentro dessa caixa.

export function ChamaVoadora({ escala }: { escala: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chamaRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let cancelado = false
    let ativo = true

    carregarSpriteComAlfa(SPRITE_CHAMA_SRC)
      .then((oc) => {
        if (!cancelado) chamaRef.current = oc
      })
      .catch(() => {})

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      const loop = (t: number) => {
        if (!ativo) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const chama = chamaRef.current
        if (chama) {
          const q = quadroDaChama(t, 0, 45)
          ctx.drawImage(chama, q * CHAMA_QUADRO_LARGURA, 0, CHAMA_QUADRO_LARGURA, CHAMA_QUADRO_ALTURA, 8, 0, 44, 84)
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    }

    return () => {
      cancelado = true
      ativo = false
    }
  }, [])

  return <canvas ref={canvasRef} width={60} height={84} style={{ width: 30 * escala, height: 42 * escala, display: 'block' }} />
}
