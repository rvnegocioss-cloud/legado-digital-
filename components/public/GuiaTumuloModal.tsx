'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2, X } from 'lucide-react'
import GuiaTumulo from './GuiaTumuloCarregador'

// Botão do topo + modal em tela cheia -- pedido do Rafael (2026-09-11, pauta
// da reunião de sócios): o mapa vivia numa seção lá embaixo, precisava rolar
// a página e clicar 2 vezes pra ver. Agora é 1 clique, direto do topo, mapa
// ocupando a tela quase inteira.
//
// A lógica do mapa/rota em si (GuiaTumulo/GuiaTumuloCarregador) continua
// 100% intocada -- regra 17. Isso aqui só troca ONDE e COMO ela é revelada,
// nunca o que ela calcula ou desenha.
interface Props {
  cemiterioNome: string
  cemiterioLat: number
  cemiterioLng: number
  lapideLat: number | null
  lapideLng: number | null
  quadra: string | null
  lote: string | null
  nomeCompleto: string
  fotoUrl: string | null
  ortoUrl: string | null
  ortoMinzoom: number | null
  ortoMaxzoom: number | null
  ortoBounds: number[] | null
  rotaCoordenadas: [number, number][] | null
  // Estilo do botão-gatilho, opcional -- default é o pill de sempre. O card
  // de identidade do memorial (2026-09-15) passa o próprio estilo pra ficar
  // igual ao botão "Rota de carro" ao lado, sem duplicar o modal inteiro.
  estiloBotao?: React.CSSProperties
}

export default function GuiaTumuloModal(props: Props) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const conteudoRef = useRef<HTMLDivElement | null>(null)
  // Tela cheia so quando a pessoa pede (botao "Tela cheia"). Pedido do
  // Rafael 2026-10-21: abrir direto em tela cheia era invasivo; abre numa
  // janela grande e proporcional na pagina.
  const [telaCheia, setTelaCheia] = useState(false)
  // Abre DENTRO da página, num espaço grande logo abaixo do topo (#guia-tumulo-area).
  // Página sem esse espaço (clássica) cai no comportamento de janela por cima.
  const [alvo, setAlvo] = useState<HTMLElement | null>(null)
  const integrado = !!alvo && alvo !== (typeof document !== 'undefined' ? document.body : null)

  // Esc fecha, trava o scroll da página de fundo, e pede tela cheia de
  // verdade -- no celular (uso real: gente andando no cemitério) a barra do
  // navegador comendo espaço do mapa pequeno era o problema. Fullscreen API
  // some com a barra onde o aparelho aceita (Android); o modal já cobre
  // 100dvh mesmo sem isso, então funciona em qualquer aparelho (iOS não
  // deixa um <div> pedir tela cheia, mas a área ocupada já é a tela toda).
  useEffect(() => {
    if (!aberto) return
    const area = document.getElementById('guia-tumulo-area')
    setAlvo(area || document.body)
    if (area) setTimeout(() => area.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    const antes = document.body.style.overflow
    if (!area) document.body.style.overflow = 'hidden'
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    function aoMudarFullscreen() {
      setTelaCheia(!!document.fullscreenElement)
    }
    window.addEventListener('keydown', tecla)
    document.addEventListener('fullscreenchange', aoMudarFullscreen)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
      document.removeEventListener('fullscreenchange', aoMudarFullscreen)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
      setTelaCheia(false)
    }
  }, [aberto])

  function alternarTelaCheia() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(() => setTelaCheia((v) => !v))
    else setTelaCheia((v) => !v)
  }

  // O GuiaTumulo (intocado, regra 17) nasce com o mapa recolhido atrás de um
  // botão próprio -- fazia sentido lá embaixo na página, mas aqui dentro do
  // modal vira 1 clique pra abrir + 1 clique pra ver o mapa. Em vez de mexer
  // no componente protegido, simulamos o clique dele mesmo assim que aparece
  // no DOM (dynamic import ssr:false -- por isso o polling, não dá pra saber
  // exatamente quando ele monta).
  useEffect(() => {
    if (!aberto) return
    let clicado = false
    const tentar = setInterval(() => {
      if (clicado) return
      const botoes = conteudoRef.current?.querySelectorAll('button') ?? []
      for (const b of botoes) {
        if (b.textContent?.includes('Guia até o túmulo dentro do cemitério')) {
          b.click()
          clicado = true
          clearInterval(tentar)
          break
        }
      }
    }, 100)
    return () => clearInterval(tentar)
  }, [aberto])

  // O link "Localização" do menu do topo apontava pra seção que não existe
  // mais -- em vez de scroll morto, abre o mesmo modal.
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const alvo = e.target as HTMLElement
      const link = alvo.closest?.('a[href="#localizacao"]')
      if (!link) return
      e.preventDefault()
      setAberto(true)
    }
    document.addEventListener('click', aoClicar)
    return () => document.removeEventListener('click', aoClicar)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={
          props.estiloBotao ?? {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '9px 16px',
            borderRadius: 8,
            border: '1px solid var(--mem-dourado, #C9A46A)',
            background: 'transparent',
            color: 'var(--mem-dourado-claro, #dfc08a)',
            fontSize: 13,
            font: 'inherit',
            cursor: 'pointer',
          }
        }
      >
        Guia até o túmulo dentro do cemitério
      </button>

      {/* Portal no <body>: no iPhone (sem tela cheia de verdade) a janela de
          reserva ficava presa na camada do topo com capa e a barra de menu
          passava por cima do mapa. Só muda ONDE o modal é desenhado. */}
      {aberto && alvo && createPortal(
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Como chegar até ${nomeCompletoSeguro(props.nomeCompleto)}`}
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1.6,
            color: '#f5f2eb',
            ...(integrado && !telaCheia
              ? { position: 'relative' as const, width: '100%', margin: '24px 0', scrollMarginTop: 96 }
              : { position: 'fixed' as const, inset: 0, zIndex: 200, width: '100vw', height: '100dvh', background: 'rgba(6,14,20,0.82)' }),
            padding: telaCheia || integrado ? 0 : 'clamp(8px, 3vw, 32px)',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: telaCheia || integrado ? '100%' : 'min(1200px, 100%)',
              height: telaCheia ? '100%' : integrado ? 'min(780px, 88dvh)' : 'min(860px, 100%)',
              borderRadius: telaCheia ? 0 : 12,
              border: telaCheia ? 0 : '1px solid rgba(201,164,106,0.25)',
              boxShadow: telaCheia || integrado ? 'none' : '0 24px 70px rgba(0,0,0,0.5)',
              background: 'var(--mem-fundo-topo, #10222f)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setAberto(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 0,
                  color: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  fontSize: 13,
                  font: 'inherit',
                  padding: '6px 4px',
                }}
              >
                ← Voltar
              </button>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Como chegar até {props.nomeCompleto}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={alternarTelaCheia}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', font: 'inherit', fontSize: 13, padding: '5px 10px' }}
              >
                {telaCheia ? <Minimize2 size={15} strokeWidth={1.5} /> : <Maximize2 size={15} strokeWidth={1.5} />}
                {telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
              </button>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                style={{
                  background: 'none',
                  border: 0,
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.5} />
              </button>
              </div>
            </div>

            <div ref={conteudoRef} className="gtm-mapa-full" style={{ flex: 1, minHeight: 0, padding: 14, overflowY: 'auto' }}>
              {/* O GuiaTumulo (regra 17, intocado) nasce com "Rota de carro"
                  + o botão retrátil "Guia até o túmulo" + o mapa. Aqui dentro
                  do modal os dois primeiros viram ruído: a rota de carro já
                  tem botão próprio fora do modal (separado, pedido do
                  Rafael), e o retrátil não faz sentido quando o mapa já abre
                  sozinho em tela cheia. Escondidos só visualmente, via CSS
                  escopado a este modal -- o componente protegido continua
                  renderizando os dois por dentro, só não aparecem aqui.
                  O GuiaTumulo (regra 17, intocado) nasce com o mapa numa
                  altura fixa pequena (480px) -- fazia sentido na seção de
                  baixo, mas aqui dentro do modal em tela cheia sobrava
                  espaço em volta e o mapa parecia cortado/pequeno. Em vez
                  de mexer na altura dentro do componente (ele é
                  compartilhado com a página clássica preservada, regra 21
                  -- mudar lá quebraria aquela página), a regra abaixo mira
                  só o elemento do mapa por classe, só dentro deste modal. */}
              <style>{`
                .gtm-mapa-full > div > a:first-child { display: none; }
                .gtm-mapa-full > div > div > button:first-child { display: none; }
                .gtm-mapa-full .maplibregl-map { height: ${telaCheia ? 'calc(100dvh - 170px)' : integrado ? 'calc(min(780px, 88dvh) - 170px)' : 'calc(min(860px, 100dvh - 64px) - 170px)'} !important; }
              `}</style>
              <GuiaTumulo
                cemiterioNome={props.cemiterioNome}
                cemiterioLat={props.cemiterioLat}
                cemiterioLng={props.cemiterioLng}
                lapideLat={props.lapideLat}
                lapideLng={props.lapideLng}
                quadra={props.quadra}
                lote={props.lote}
                nomeCompleto={props.nomeCompleto}
                fotoUrl={props.fotoUrl}
                ortoUrl={props.ortoUrl}
                ortoMinzoom={props.ortoMinzoom}
                ortoMaxzoom={props.ortoMaxzoom}
                ortoBounds={props.ortoBounds}
                rotaCoordenadas={props.rotaCoordenadas}
              />
            </div>
          </div>
        </div>,
        alvo,
      )}
    </>
  )
}

function nomeCompletoSeguro(n: string) {
  return n || 'o memorial'
}
