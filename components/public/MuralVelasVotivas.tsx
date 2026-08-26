'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { usaReducaoMovimento } from '@/lib/usaReducaoMovimento'
import {
  MURAL_COLS,
  MURAL_FILAS,
  MURAL_TOTAL,
  MURAL_QUADRO_LARGURA,
  MURAL_QUADRO_ALTURA,
  MURAL_QUADROS_NA_SPRITE,
  POSTO_DO_SLOT,
  alturaDoMural,
  lugarDaVela,
  topoDoCopoDaVela,
  type LugarVela,
} from '@/lib/muralVelas'

// Mural de velas votivas — migrado do protótipo aprovado pelo Rafael
// (Desktop\Cerebro Claude - Legado Digital\prototipo-parede-velas\).
// Ver MIGRAR-PARA-O-PROJETO.md pro histórico completo das decisões.
//
// Fundo fotográfico (altar: madeira + veludo + flores) via CSS no wrapper;
// o canvas por cima só desenha o vidro, o brilho e a chama de cada vela —
// transparente, então o fundo aparece por trás sem custar um segundo layer.
//
// A sprite da chama é RGB sem canal alfa (fundo preto sólido). Desenhar isso
// direto com 'lighter' num canvas transparente pinta um retângulo preto em
// volta de cada chama. Corrigido dando alfa à sprite UMA vez no carregamento
// (alfa = brilho do pixel, preto vira transparente de verdade) — depois disso
// o desenho é source-over normal, sem blend mode nenhum.

export interface MuralVelasVotivasHandle {
  /** Posição em coordenadas de viewport (como getBoundingClientRect) do topo
   *  do copo de um slot físico — pra pousar a chama que "voa" da vela principal. */
  obterPosicaoDoSlot(slotFisico: number): { top: number; left: number } | null
}

export const MuralVelasVotivas = forwardRef<
  MuralVelasVotivasHandle,
  { acesas: number; slotRecemAceso: number | null }
>(function MuralVelasVotivas({ acesas, slotRecemAceso }, refExterno) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chamaRef = useRef<HTMLCanvasElement | null>(null) // sprite já com alfa
  const medidasRef = useRef({ larguraCanvas: 0, alturaCanvas: 0 })
  const nascidoEmRef = useRef(0)
  const reduzMovimento = usaReducaoMovimento()

  // Props lidas dentro do loop de desenho via ref — não reinicia o rAF a
  // cada mudança de `acesas` (loop de animação sobrevive ao React re-render).
  const acesasRef = useRef(acesas)
  acesasRef.current = acesas
  const slotRecemAcesoRef = useRef(slotRecemAceso)
  useEffect(() => {
    slotRecemAcesoRef.current = slotRecemAceso
    if (slotRecemAceso !== null) nascidoEmRef.current = performance.now()
  }, [slotRecemAceso])

  useImperativeHandle(refExterno, () => ({
    obterPosicaoDoSlot(slotFisico) {
      const canvas = canvasRef.current
      if (!canvas) return null
      const { larguraCanvas, alturaCanvas } = medidasRef.current
      if (!larguraCanvas || !alturaCanvas) return null
      const r = canvas.getBoundingClientRect()
      const lugar = lugarDaVela(slotFisico, larguraCanvas, alturaCanvas)
      const topo = topoDoCopoDaVela(lugar)
      return { top: r.top + topo, left: r.left + lugar.x }
    },
  }))

  // Carrega a sprite da chama e extrai o alfa uma única vez.
  useEffect(() => {
    let cancelado = false
    const sprite = new Image()
    sprite.onload = () => {
      if (cancelado) return
      const oc = document.createElement('canvas')
      oc.width = sprite.naturalWidth
      oc.height = sprite.naturalHeight
      const o = oc.getContext('2d')
      if (!o) return
      o.drawImage(sprite, 0, 0)
      const dados = o.getImageData(0, 0, oc.width, oc.height)
      const px = dados.data
      for (let i = 0; i < px.length; i += 4) {
        const lum = Math.max(px[i], px[i + 1], px[i + 2])
        px[i + 3] = lum < 10 ? 0 : lum
      }
      o.putImageData(dados, 0, 0)
      chamaRef.current = oc
    }
    sprite.src = '/fio-da-vida/chama-sprite.png' // mesmo arquivo da landing (hash idêntico)
    return () => {
      cancelado = true
    }
  }, [])

  // Medida + desenho.
  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)

    function medir() {
      const larg = host!.clientWidth || 440
      const alt = alturaDoMural(larg)
      medidasRef.current = { larguraCanvas: larg, alturaCanvas: alt }
      canvas!.width = Math.round(larg * dpr)
      canvas!.height = Math.round(alt * dpr)
      canvas!.style.height = alt + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function arredondado(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath()
      ctx!.moveTo(x + r, y)
      ctx!.lineTo(x + w - r, y)
      ctx!.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx!.lineTo(x + w, y + h - r)
      ctx!.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx!.lineTo(x + r, y + h)
      ctx!.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx!.lineTo(x, y + r)
      ctx!.quadraticCurveTo(x, y, x + r, y)
      ctx!.closePath()
    }

    function copo(p: LugarVela, viva: boolean) {
      const w = 30 * p.escala
      const h = 40 * p.escala
      const r = 5 * p.escala
      const x = p.x - w / 2
      const y = p.y - h

      // O vidro acende por dentro quando viva — não só a chama.
      const g = ctx!.createLinearGradient(0, y, 0, y + h)
      if (viva) {
        g.addColorStop(0.0, 'rgba(255,208,142,0.72)')
        g.addColorStop(0.42, 'rgba(236,152,64,0.66)')
        g.addColorStop(1.0, 'rgba(146,78,28,0.62)')
      } else {
        g.addColorStop(0, 'rgba(198,188,172,0.10)')
        g.addColorStop(1, 'rgba(116,106,92,0.18)')
      }
      ctx!.fillStyle = g
      arredondado(x, y, w, h, r)
      ctx!.fill()

      ctx!.strokeStyle = viva ? 'rgba(255,216,156,0.46)' : 'rgba(201,164,106,0.15)'
      ctx!.lineWidth = Math.max(0.6, 0.9 * p.escala)
      ctx!.stroke()

      // Brilho só de um lado do vidro — dos dois lados vira plástico.
      ctx!.fillStyle = `rgba(255,255,255,${viva ? 0.16 : 0.05})`
      ctx!.fillRect(x + w * 0.17, y + h * 0.15, w * 0.12, h * 0.6)

      ctx!.fillStyle = viva ? 'rgba(255,240,212,0.55)' : 'rgba(212,204,188,0.15)'
      ctx!.fillRect(x + w * 0.25, y + h * 0.11, w * 0.5, h * 0.15)

      return { topo: y }
    }

    function prateleira(fila: number) {
      const p = lugarDaVela(fila * MURAL_COLS, medidasRef.current.larguraCanvas, medidasRef.current.alturaCanvas)
      const q = lugarDaVela(
        fila * MURAL_COLS + MURAL_COLS - 1,
        medidasRef.current.larguraCanvas,
        medidasRef.current.alturaCanvas
      )
      const x0 = p.x - 30 * p.escala
      const x1 = q.x + 30 * q.escala
      const y = p.y + 1.5 * p.escala
      const g = ctx!.createLinearGradient(x0, 0, x1, 0)
      g.addColorStop(0, 'rgba(201,164,106,0)')
      g.addColorStop(0.5, `rgba(201,164,106,${(0.14 + 0.12 * p.t).toFixed(3)})`)
      g.addColorStop(1, 'rgba(201,164,106,0)')
      ctx!.fillStyle = g
      ctx!.fillRect(x0, y, x1 - x0, Math.max(1, 1.2 * p.escala))

      const r = ctx!.createLinearGradient(0, y, 0, y + 13 * p.escala)
      r.addColorStop(0, 'rgba(255,172,92,0.12)')
      r.addColorStop(1, 'rgba(255,172,92,0)')
      ctx!.fillStyle = r
      ctx!.fillRect(x0, y, x1 - x0, 13 * p.escala)
    }

    function desenhar(t: number) {
      const { larguraCanvas: W, alturaCanvas: H } = medidasRef.current
      ctx!.clearRect(0, 0, W, H)
      for (let f = 0; f < MURAL_FILAS; f++) prateleira(f)

      const acesasAgora = acesasRef.current
      const recemAceso = slotRecemAcesoRef.current
      const nascidoEm = nascidoEmRef.current

      for (let i = 0; i < MURAL_TOTAL; i++) {
        const p = lugarDaVela(i, W, H)
        const viva = POSTO_DO_SLOT[i] < acesasAgora
        const novoAgora = i === recemAceso ? Math.max(0, 1 - (t - nascidoEm) / 900) : 0
        const c = copo(p, viva)
        if (!viva) continue

        ctx!.globalCompositeOperation = 'lighter'
        const cy = c.topo - 9 * p.escala
        const hg = ctx!.createRadialGradient(p.x, cy, 0, p.x, cy, 34 * p.escala)
        hg.addColorStop(0, `rgba(255,192,112,${(0.4 + 0.55 * novoAgora).toFixed(3)})`)
        hg.addColorStop(0.4, 'rgba(255,150,60,0.13)')
        hg.addColorStop(1, 'rgba(255,140,50,0)')
        ctx!.fillStyle = hg
        ctx!.beginPath()
        ctx!.arc(p.x, cy, 34 * p.escala, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.globalCompositeOperation = 'source-over'
        const chama = chamaRef.current
        if (chama) {
          const ciclo = MURAL_QUADROS_NA_SPRITE * 2 - 2
          const k = Math.floor(t / 55 + i * 7) % ciclo
          const q = k < MURAL_QUADROS_NA_SPRITE ? k : ciclo - k // ping-pongue: sem emenda no loop
          const alt = 40 * p.escala
          const lar = alt * (MURAL_QUADRO_LARGURA / MURAL_QUADRO_ALTURA) * 1.5
          ctx!.drawImage(
            chama,
            q * MURAL_QUADRO_LARGURA,
            0,
            MURAL_QUADRO_LARGURA,
            MURAL_QUADRO_ALTURA,
            p.x - lar / 2,
            c.topo - alt * 0.92,
            lar,
            alt
          )
        }
      }
    }

    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(host)

    let ativo = true
    if (reduzMovimento) {
      desenhar(0)
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
      ro.disconnect()
    }
  }, [reduzMovimento])

  return (
    <div
      ref={hostRef}
      className="mural-velas-votivas"
      role="img"
      aria-label={`Mural com ${MURAL_TOTAL} velas votivas`}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
    </div>
  )
})
