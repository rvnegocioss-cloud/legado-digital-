'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { usaReducaoMovimento } from '@/lib/usaReducaoMovimento'
import { SPRITE_CHAMA_SRC, CHAMA_QUADRO_LARGURA, CHAMA_QUADRO_ALTURA, carregarSpriteComAlfa, quadroDaChama } from '@/lib/chamaAlfa'
import {
  VELA_ESCALA,
  VELA_LARGURA_DESENHO,
  VELA_ALTURA_DESENHO,
  VELA_CX,
  VELA_BASE_Y,
  VELA_LARGURA_CORPO,
  VELA_TOPO,
  VELA_PRATO,
  pontoDoPavio,
} from '@/lib/velaPrincipalCastical'

// Vela principal em castiçal de bronze, com cera escorrendo — migrada do
// protótipo aprovado pelo Rafael (decisão confirmada 2026-08-26/27,
// MIGRAR-PARA-O-PROJETO.md), no lugar da vela fina anterior.
//
// Ela é a fonte da chama que "voa" pra parede, então precisa ter presença —
// por isso desenhada em canvas na mesma linguagem do mural de velas votivas
// (e reaproveitando a mesma sprite de chama).

export interface VelaPrincipalCasticalHandle {
  /** Posição em coordenadas de viewport do pavio — de onde a chama que voa nasce. */
  obterPosicaoDoPavio(): { top: number; left: number } | null
}

export const VelaPrincipalCastical = forwardRef<VelaPrincipalCasticalHandle, { acesa: boolean }>(
  function VelaPrincipalCastical({ acesa }, refExterno) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const chamaRef = useRef<HTMLCanvasElement | null>(null)
    const acesaRef = useRef(acesa)
    const nascidoEmRef = useRef(0)
    const reduzMovimento = usaReducaoMovimento()

    useEffect(() => {
      const estavaAcesa = acesaRef.current
      acesaRef.current = acesa
      if (acesa && !estavaAcesa) nascidoEmRef.current = performance.now()
    }, [acesa])

    useImperativeHandle(refExterno, () => ({
      obterPosicaoDoPavio() {
        const canvas = canvasRef.current
        if (!canvas) return null
        const r = canvas.getBoundingClientRect()
        const escala = r.width / VELA_LARGURA_DESENHO
        const p = pontoDoPavio()
        return { top: r.top + p.y * escala, left: r.left + p.x * escala }
      },
    }))

    useEffect(() => {
      let cancelado = false
      carregarSpriteComAlfa(SPRITE_CHAMA_SRC)
        .then((oc) => {
          if (!cancelado) chamaRef.current = oc
        })
        .catch(() => {})
      return () => {
        cancelado = true
      }
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(VELA_LARGURA_DESENHO * VELA_ESCALA * dpr)
      canvas.height = Math.round(VELA_ALTURA_DESENHO * VELA_ESCALA * dpr)
      canvas.style.width = VELA_LARGURA_DESENHO * VELA_ESCALA + 'px'
      canvas.style.height = VELA_ALTURA_DESENHO * VELA_ESCALA + 'px'
      ctx.setTransform(dpr * VELA_ESCALA, 0, 0, dpr * VELA_ESCALA, 0, 0)

      function elipse(cx: number, cy: number, rx: number, ry: number) {
        ctx!.beginPath()
        ctx!.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx!.closePath()
      }

      // Bronze: claro no alto-esquerda, escuro embaixo-direita — senão vira cinza chapado.
      function bronze(y0: number, y1: number, forte: boolean) {
        const g = ctx!.createLinearGradient(VELA_CX - 40, y0, VELA_CX + 40, y1)
        g.addColorStop(0.0, forte ? '#6b5327' : '#4e3d20')
        g.addColorStop(0.22, '#b99450')
        g.addColorStop(0.42, '#e6c98c')
        g.addColorStop(0.62, '#a8823f')
        g.addColorStop(1.0, '#3d2f18')
        return g
      }

      function desenharCastical() {
        const CX = VELA_CX
        const BASE_Y = VELA_BASE_Y
        const PRATO = VELA_PRATO

        // Sombra no chão.
        const so = ctx!.createRadialGradient(CX, BASE_Y + 3, 2, CX, BASE_Y + 3, 62)
        so.addColorStop(0, 'rgba(0,0,0,0.42)')
        so.addColorStop(1, 'rgba(0,0,0,0)')
        ctx!.fillStyle = so
        elipse(CX, BASE_Y + 4, 62, 11)
        ctx!.fill()

        // Base em dois degraus.
        ctx!.fillStyle = bronze(BASE_Y - 14, BASE_Y + 6, true)
        elipse(CX, BASE_Y, 52, 12)
        ctx!.fill()
        ctx!.fillStyle = bronze(BASE_Y - 20, BASE_Y - 4, false)
        elipse(CX, BASE_Y - 9, 41, 9.5)
        ctx!.fill()
        ctx!.fillStyle = bronze(BASE_Y - 26, BASE_Y - 12, true)
        elipse(CX, BASE_Y - 17, 30, 7.5)
        ctx!.fill()

        // Haste com cintura.
        const h = ctx!.createLinearGradient(CX - 14, 0, CX + 14, 0)
        h.addColorStop(0.0, '#4a3a1d')
        h.addColorStop(0.26, '#d8bb7e')
        h.addColorStop(0.5, '#f0dcae')
        h.addColorStop(0.74, '#a8823f')
        h.addColorStop(1.0, '#33280f')
        ctx!.fillStyle = h
        ctx!.beginPath()
        ctx!.moveTo(CX - 11, BASE_Y - 20)
        ctx!.bezierCurveTo(CX - 6, BASE_Y - 40, CX - 6, BASE_Y - 44, CX - 8, BASE_Y - 52)
        ctx!.lineTo(CX + 8, BASE_Y - 52)
        ctx!.bezierCurveTo(CX + 6, BASE_Y - 44, CX + 6, BASE_Y - 40, CX + 11, BASE_Y - 20)
        ctx!.closePath()
        ctx!.fill()

        // Nó da haste.
        ctx!.fillStyle = bronze(BASE_Y - 50, BASE_Y - 34, true)
        elipse(CX, BASE_Y - 42, 15, 11)
        ctx!.fill()
        ctx!.fillStyle = 'rgba(255,240,206,0.30)'
        elipse(CX - 5, BASE_Y - 46, 5, 3.4)
        ctx!.fill()

        // Copa onde a vela senta.
        ctx!.fillStyle = bronze(PRATO - 12, PRATO + 8, true)
        ctx!.beginPath()
        ctx!.moveTo(CX - 38, PRATO + 4)
        ctx!.bezierCurveTo(CX - 34, PRATO - 12, CX - 26, PRATO - 15, CX - 26, PRATO - 15)
        ctx!.lineTo(CX + 26, PRATO - 15)
        ctx!.bezierCurveTo(CX + 26, PRATO - 15, CX + 34, PRATO - 12, CX + 38, PRATO + 4)
        ctx!.closePath()
        ctx!.fill()
        ctx!.fillStyle = bronze(PRATO, PRATO + 10, false)
        elipse(CX, PRATO + 4, 38, 8)
        ctx!.fill()
      }

      function desenharVela(viva: number) {
        const CX = VELA_CX
        const LARG = VELA_LARGURA_CORPO
        const TOPO = VELA_TOPO
        const PRATO = VELA_PRATO
        const x0 = CX - LARG / 2
        const x1 = CX + LARG / 2

        // Corpo: cilindro precisa de sombra lateral, senão vira retângulo chapado.
        const g = ctx!.createLinearGradient(x0, 0, x1, 0)
        g.addColorStop(0.0, '#b9ab92')
        g.addColorStop(0.16, '#efe4cd')
        g.addColorStop(0.4, '#fbf4e5')
        g.addColorStop(0.72, '#e4d6ba')
        g.addColorStop(1.0, '#a2947c')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.moveTo(x0, TOPO + 6)
        ctx!.lineTo(x0, PRATO - 12)
        ctx!.lineTo(x1, PRATO - 12)
        ctx!.lineTo(x1, TOPO + 6)
        ctx!.closePath()
        ctx!.fill()

        // Luz da chama batendo na cera, de cima pra baixo.
        const lz = ctx!.createLinearGradient(0, TOPO, 0, TOPO + 92)
        lz.addColorStop(0, `rgba(255,196,116,${(0.34 * viva).toFixed(3)})`)
        lz.addColorStop(1, 'rgba(255,196,116,0)')
        ctx!.fillStyle = lz
        ctx!.fillRect(x0, TOPO, LARG, 92)

        // Cera escorrendo pela lateral — larguras e comprimentos diferentes,
        // senão parece decoração repetida em vez de cera de verdade.
        const escorridos = [
          { x: x0 + 5, w: 7, h: 54 },
          { x: x0 + 15, w: 5, h: 30 },
          { x: CX + 3, w: 8, h: 68 },
          { x: x1 - 16, w: 6, h: 41 },
          { x: x1 - 7, w: 5, h: 24 },
        ]
        for (const e of escorridos) {
          const eg = ctx!.createLinearGradient(e.x, 0, e.x + e.w, 0)
          eg.addColorStop(0, 'rgba(255,250,238,0.30)')
          eg.addColorStop(0.45, '#fdf6e7')
          eg.addColorStop(1, 'rgba(186,172,146,0.75)')
          ctx!.fillStyle = eg
          ctx!.beginPath()
          ctx!.moveTo(e.x, TOPO + 7)
          ctx!.lineTo(e.x + e.w, TOPO + 7)
          ctx!.lineTo(e.x + e.w, TOPO + e.h)
          // A ponta da gota é arredondada.
          ctx!.quadraticCurveTo(e.x + e.w / 2, TOPO + e.h + e.w * 1.15, e.x, TOPO + e.h)
          ctx!.closePath()
          ctx!.fill()
        }

        // Boca da vela: poça de cera derretida.
        ctx!.fillStyle = '#f6ecd6'
        elipse(CX, TOPO + 6, LARG / 2, 8)
        ctx!.fill()
        const pg = ctx!.createRadialGradient(CX, TOPO + 5, 1, CX, TOPO + 5, 17)
        pg.addColorStop(0, `rgba(255,214,150,${(0.3 + 0.62 * viva).toFixed(3)})`)
        pg.addColorStop(0.55, `rgba(246,224,180,${(0.22 + 0.33 * viva).toFixed(3)})`)
        pg.addColorStop(1, 'rgba(232,214,178,0)')
        ctx!.fillStyle = pg
        elipse(CX, TOPO + 5, 17, 6)
        ctx!.fill()

        // Pavio.
        ctx!.strokeStyle = '#3a2c1c'
        ctx!.lineWidth = 2.2
        ctx!.lineCap = 'round'
        ctx!.beginPath()
        ctx!.moveTo(CX, TOPO + 4)
        ctx!.lineTo(CX - 1, TOPO - 5)
        ctx!.stroke()
      }

      function desenhar(t: number) {
        ctx!.clearRect(0, 0, VELA_LARGURA_DESENHO, VELA_ALTURA_DESENHO)
        // Fica apagada em repouso; acende com uma rampa suave de 220ms (não
        // salta pra 100% — mesmo comportamento do protótipo), e apaga na hora
        // quando `acesa` vira false (ela é só o gesto de acender, não fica
        // queimando pra sempre).
        const viva = acesaRef.current ? Math.min(1, (t - nascidoEmRef.current) / 220) : 0

        if (viva > 0) {
          const hg = ctx!.createRadialGradient(VELA_CX, VELA_TOPO - 14, 4, VELA_CX, VELA_TOPO - 14, 108)
          hg.addColorStop(0, `rgba(255,190,110,${(0.3 * viva).toFixed(3)})`)
          hg.addColorStop(0.35, `rgba(255,160,70,${(0.1 * viva).toFixed(3)})`)
          hg.addColorStop(1, 'rgba(255,150,60,0)')
          ctx!.fillStyle = hg
          ctx!.beginPath()
          ctx!.arc(VELA_CX, VELA_TOPO - 14, 108, 0, Math.PI * 2)
          ctx!.fill()
        }

        desenharCastical()
        desenharVela(viva)

        const chama = chamaRef.current
        if (chama && viva > 0.02) {
          const q = quadroDaChama(t, 0, 48)
          const alt = 74 * (0.55 + 0.45 * viva)
          const lar = alt * (CHAMA_QUADRO_LARGURA / CHAMA_QUADRO_ALTURA) * 1.5
          ctx!.globalAlpha = viva
          ctx!.drawImage(
            chama,
            q * CHAMA_QUADRO_LARGURA,
            0,
            CHAMA_QUADRO_LARGURA,
            CHAMA_QUADRO_ALTURA,
            VELA_CX - lar / 2,
            VELA_TOPO - alt * 0.86,
            lar,
            alt
          )
          ctx!.globalAlpha = 1
        }
      }

      let ativo = true
      if (reduzMovimento) {
        desenhar(acesaRef.current ? 220 : 0) // já "acesa" de propósito, sem animar a rampa
      } else {
        const loop = (t: number) => {
          if (!ativo) return
          desenhar(t)
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      }

      return () => {
        ativo = false
      }
    }, [reduzMovimento])

    return (
      <div
        style={{ position: 'relative', width: VELA_LARGURA_DESENHO * VELA_ESCALA, height: VELA_ALTURA_DESENHO * VELA_ESCALA }}
        role="img"
        aria-label="Vela em castiçal de bronze"
      >
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    )
  }
)
