'use client'

import { useRef, useState } from 'react'
import { CORES } from '@/lib/publicTheme'
import { MuralVelasVotivas, type MuralVelasVotivasHandle } from './MuralVelasVotivas'
import { MURAL_TOTAL, slotFisicoDaOrdem } from '@/lib/muralVelas'
import { VelaPrincipalCastical, type VelaPrincipalCasticalHandle } from './VelaPrincipalCastical'
import { ChamaVoadora } from './ChamaVoadora'
import { VELA_ESCALA } from '@/lib/velaPrincipalCastical'

interface Voo {
  top: number
  left: number
  fase: 'inicio' | 'fim'
}

export function AcenderVela({ slug, velasIniciais }: { slug: string; velasIniciais: number }) {
  // Vela principal fica APAGADA por padrão. Ao clicar: acende brevemente,
  // a chama "voa" até a parede e acende a vela de lá, depois a principal
  // apaga de novo — ela é só o gesto de acender, não fica queimando pra sempre.
  const [contagem, setContagem] = useState(velasIniciais)
  // Módulo, não Math.min — depois que a parede já deu uma volta completa (mais de
  // 45 no total), ela reflete só o progresso da volta atual, não fica sempre cheia.
  const [paredeAcesas, setParedeAcesas] = useState(() => velasIniciais % MURAL_TOTAL)
  // Slot FÍSICO (posição real no mural, depois do embaralho) que acabou de
  // acender — o mural usa isso pro pulso de luz.
  const [slotRecemAceso, setSlotRecemAceso] = useState<number | null>(null)
  const [voo, setVoo] = useState<Voo | null>(null)
  const [principalAcesa, setPrincipalAcesa] = useState(false)

  const secaoRef = useRef<HTMLDivElement | null>(null)
  const velaPrincipalRef = useRef<VelaPrincipalCasticalHandle | null>(null)
  const muralRef = useRef<MuralVelasVotivasHandle | null>(null)
  // Próxima POSIÇÃO NA ORDEM de acendimento (0..34) — não é o slot físico
  // direto; o mural embaralha ordem de acendimento x posição na parede pra
  // não encher da esquerda pra direita como barra de progresso. Depois que
  // os 35 já estão acesos, continua em loop (a chama sempre voa em algum lugar).
  const proximoIndiceRef = useRef(velasIniciais % MURAL_TOTAL)

  function acenderEApagarPrincipal(duracaoMs: number) {
    setPrincipalAcesa(true)
    setTimeout(() => setPrincipalAcesa(false), duracaoMs)
  }

  function acenderSlotDaParede(posicaoNaOrdem: number) {
    setParedeAcesas((p) => Math.max(p, posicaoNaOrdem + 1))
    const slotFisico = slotFisicoDaOrdem(posicaoNaOrdem)
    setSlotRecemAceso(slotFisico)
    setTimeout(() => setSlotRecemAceso(null), 700)

    // Parede completou a volta (acendeu a última) — apaga tudo depois de um
    // instante e recomeça do zero no próximo clique (pedido do Rafael, 2026-07-24).
    if (posicaoNaOrdem === MURAL_TOTAL - 1) {
      setTimeout(() => setParedeAcesas(0), 1200)
    }
  }

  function iniciarVoo(posicaoNaOrdem: number) {
    const secao = secaoRef.current
    const posOrigem = velaPrincipalRef.current?.obterPosicaoDoPavio() ?? null
    const posDestino = muralRef.current?.obterPosicaoDoSlot(slotFisicoDaOrdem(posicaoNaOrdem)) ?? null

    acenderEApagarPrincipal(1300)

    if (!secao || !posOrigem || !posDestino) {
      // Sem medida possível (refs ainda não montaram) — acende direto, sem animação de voo.
      acenderSlotDaParede(posicaoNaOrdem)
      return
    }

    const rSecao = secao.getBoundingClientRect()

    setVoo({
      top: posOrigem.top - rSecao.top,
      left: posOrigem.left - rSecao.left,
      fase: 'inicio',
    })

    setTimeout(() => {
      setVoo({
        top: posDestino.top - rSecao.top,
        left: posDestino.left - rSecao.left,
        fase: 'fim',
      })
    }, 20)

    setTimeout(() => {
      setVoo(null)
      acenderSlotDaParede(posicaoNaOrdem)
    }, 900)
  }

  async function acender() {
    // Sem limite de 1x por visitante — cada clique conta e voa de novo,
    // quantas vezes a pessoa quiser (pedido explícito do Rafael, 2026-07-24).
    const res = await fetch('/api/memorial-vela', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    if (!res.ok) return
    const json = await res.json()

    const novoTotal = typeof json.total === 'number' ? json.total : contagem + 1
    setContagem(novoTotal)

    const alvo = proximoIndiceRef.current
    proximoIndiceRef.current = (alvo + 1) % MURAL_TOTAL
    iniciarVoo(alvo)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative' }} ref={secaoRef}>
      {/* Mural de velas votivas — canvas com fundo fotográfico (altar), migrado
          do protótipo aprovado pelo Rafael. */}
      <MuralVelasVotivas ref={muralRef} acesas={paredeAcesas} slotRecemAceso={slotRecemAceso} />

      {/* Chama voando da vela principal até a vela da parede recém-acesa —
          mesma sprite do castiçal e da parede, pra não trocar de formato no ar. */}
      {voo && (
        <div
          className="vela-voo"
          style={{
            position: 'absolute',
            top: voo.top,
            left: voo.left,
            transform: `translate(0,-100%) translateX(-50%) scale(${voo.fase === 'fim' ? 0.4 : 1})`,
            opacity: voo.fase === 'fim' ? 0.15 : 1,
            filter: 'drop-shadow(0 0 8px rgba(255,170,80,0.6))',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          <ChamaVoadora escala={VELA_ESCALA} />
        </div>
      )}

      {/* Vela principal — castiçal de bronze com cera escorrendo, migrado do
          protótipo aprovado pelo Rafael (decisão confirmada 2026-08-26/27,
          MIGRAR-PARA-O-PROJETO.md). Fica apagada por padrão, acende só no
          gesto de clicar (ver acender()/iniciarVoo()). */}
      <VelaPrincipalCastical ref={velaPrincipalRef} acesa={principalAcesa} />

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
        ACENDER UMA VELA
      </button>

      <div style={{ fontSize: 12, color: CORES.dourado, marginTop: 2, textAlign: 'center' }}>
        {contagem} {contagem === 1 ? 'vela acesa por quem visitou' : 'velas acesas por quem visitou'}
      </div>
    </div>
  )
}
