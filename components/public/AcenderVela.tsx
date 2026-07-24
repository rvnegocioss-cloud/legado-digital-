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
  // Vela principal fica APAGADA por padrão. Ao clicar: acende brevemente,
  // a chama "voa" até a parede e acende a vela de lá, depois a principal
  // apaga de novo — ela é só o gesto de acender, não fica queimando pra sempre.
  const [contagem, setContagem] = useState(velasIniciais)
  const [paredeAcesas, setParedeAcesas] = useState(() => Math.min(velasIniciais, TAMANHO_PAREDE))
  const [indiceRecemAceso, setIndiceRecemAceso] = useState<number | null>(null)
  const [voo, setVoo] = useState<Voo | null>(null)
  const [principalAcesa, setPrincipalAcesa] = useState(false)
  const [jaAcendi, setJaAcendi] = useState(false)

  const secaoRef = useRef<HTMLDivElement | null>(null)
  const chamaPrincipalRef = useRef<HTMLDivElement | null>(null)
  const paredeRefs = useRef<Record<number, HTMLDivElement | null>>({})
  // Próximo slot da parede a "reacender" — depois que os 45 já estão acesos,
  // continua em loop pelos mesmos índices (a chama sempre voa em algum lugar).
  const proximoIndiceRef = useRef(Math.min(velasIniciais, TAMANHO_PAREDE) % TAMANHO_PAREDE)

  function acenderEApagarPrincipal(duracaoMs: number) {
    setPrincipalAcesa(true)
    setTimeout(() => setPrincipalAcesa(false), duracaoMs)
  }

  function acenderSlotDaParede(indiceAlvo: number) {
    setParedeAcesas((p) => Math.max(p, indiceAlvo + 1))
    setIndiceRecemAceso(indiceAlvo)
    setTimeout(() => setIndiceRecemAceso(null), 700)

    // Parede completou a volta (acendeu a última) — apaga tudo depois de um
    // instante e recomeça do zero no próximo clique (pedido do Rafael, 2026-07-24).
    if (indiceAlvo === TAMANHO_PAREDE - 1) {
      setTimeout(() => setParedeAcesas(0), 1200)
    }
  }

  function iniciarVoo(indiceAlvo: number) {
    const secao = secaoRef.current
    const origem = chamaPrincipalRef.current
    const destino = paredeRefs.current[indiceAlvo]

    acenderEApagarPrincipal(1300)

    if (!secao || !origem || !destino) {
      // Sem medida possível (refs ainda não montaram) — acende direto, sem animação de voo.
      acenderSlotDaParede(indiceAlvo)
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
      acenderSlotDaParede(indiceAlvo)
    }, 900)
  }

  async function acender() {
    // Sem limite de 1x por visitante — cada clique conta e voa de novo,
    // quantas vezes a pessoa quiser (pedido explícito do Rafael, 2026-07-24).
    const { data, error } = await supabase.rpc('acender_vela', { p_slug: slug })
    if (error) return

    setJaAcendi(true)
    const novoTotal = typeof data === 'number' ? data : contagem + 1
    setContagem(novoTotal)

    const alvo = proximoIndiceRef.current
    proximoIndiceRef.current = (alvo + 1) % TAMANHO_PAREDE
    iniciarVoo(alvo)
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
                style={{ position: 'relative', width: 28, height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
              >
                {/* Copo/cuia da vela votiva */}
                <div
                  style={{
                    width: 15,
                    height: 18,
                    borderRadius: '2px 2px 6px 6px',
                    background: 'linear-gradient(180deg, rgba(201,164,106,0.15), rgba(160,124,72,0.32))',
                    border: `1px solid ${CORES.douradoBorda}`,
                  }}
                />
                {/* Glow atrás da chama */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 11,
                    left: '50%',
                    width: 24,
                    height: 24,
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(circle, rgba(255,196,120,0.55), transparent 70%)',
                    opacity: estaAcesa ? 0.85 : 0,
                    transition: 'opacity 0.6s ease',
                    pointerEvents: 'none',
                  }}
                />
                {/* Pavio */}
                <div style={{ position: 'absolute', bottom: 16, left: '50%', width: 2, height: 5, background: '#4a3a28', transform: 'translateX(-50%)' }} />
                {estaAcesa && (
                  <div
                    className={`vela-flame${acabouDeAcender ? ' vela-parede-acender' : ''}`}
                    style={{
                      position: 'absolute',
                      bottom: 18,
                      left: '50%',
                      width: 7,
                      height: 11,
                      animationDuration: `${(2 + seed * 1.4).toFixed(2)}s`,
                      animationDelay: `${(-seed * 2).toFixed(2)}s`,
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
          className="vela-voo vela-flame"
          style={{
            position: 'absolute',
            top: voo.top,
            left: voo.left,
            width: 14,
            height: 20,
            animation: 'none',
            transform: `translate(0,-100%) translateX(-50%) rotate(-45deg) scale(${voo.fase === 'fim' ? 0.4 : 1})`,
            opacity: voo.fase === 'fim' ? 0.15 : 1,
            filter: 'drop-shadow(0 0 8px rgba(255,170,80,0.6))',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />
      )}

      {/* Vela principal — mesma forma de chama do mockup (border-radius + rotate),
          fica apagada por padrão, acende só no gesto de clicar (ver acender()/iniciarVoo()). */}
      <div style={{ position: 'relative', width: 120, height: 100, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div
          style={{
            width: 14,
            height: 60,
            background: 'linear-gradient(#EAE3D6, #C9A46A)',
            borderRadius: 2,
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.25)',
          }}
        >
          {/* Pavio — âncora fixa pro cálculo de voo (getBoundingClientRect), sempre montado */}
          <div
            ref={chamaPrincipalRef}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              marginLeft: -1,
              width: 2,
              height: 8,
              background: '#2a221a',
            }}
          >
            {/* Brasa — visível só quando apagada */}
            {!principalAcesa && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  marginLeft: -2,
                  width: 4,
                  height: 4,
                  borderRadius: '1em',
                  background: 'radial-gradient(circle at top right, #ffe98a, #ff5a1f)',
                }}
              />
            )}
          </div>

          {principalAcesa && (
            <>
              <div
                className="vela-glow"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  marginLeft: -35,
                  width: 70,
                  height: 70,
                  background: 'radial-gradient(circle, rgba(255,196,120,0.5), transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                className="vela-flame"
                style={{ position: 'absolute', bottom: 'calc(100% - 4px)', left: '50%', width: 22, height: 30 }}
              />
            </>
          )}
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
