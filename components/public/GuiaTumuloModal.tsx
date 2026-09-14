'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
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
}

export default function GuiaTumuloModal(props: Props) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Esc fecha, trava o scroll da página de fundo, e pede tela cheia de
  // verdade -- no celular (uso real: gente andando no cemitério) a barra do
  // navegador comendo espaço do mapa pequeno era o problema. Fullscreen API
  // some com a barra onde o aparelho aceita (Android); o modal já cobre
  // 100dvh mesmo sem isso, então funciona em qualquer aparelho (iOS não
  // deixa um <div> pedir tela cheia, mas a área ocupada já é a tela toda).
  useEffect(() => {
    if (!aberto) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    containerRef.current?.requestFullscreen?.().catch(() => {})
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    function aoMudarFullscreen() {
      if (!document.fullscreenElement) setAberto(false)
    }
    window.addEventListener('keydown', tecla)
    document.addEventListener('fullscreenchange', aoMudarFullscreen)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
      document.removeEventListener('fullscreenchange', aoMudarFullscreen)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
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
        style={{
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
        }}
      >
        Guia até o túmulo dentro do cemitério
      </button>

      {aberto && (
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Como chegar até ${nomeCompletoSeguro(props.nomeCompleto)}`}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            width: '100vw',
            height: '100dvh',
            background: 'rgba(6,14,20,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
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
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>
                Como chegar até {props.nomeCompleto}
              </h3>
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

            <div style={{ flex: 1, minHeight: 0, padding: 14, overflowY: 'auto' }}>
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
        </div>
      )}
    </>
  )
}

function nomeCompletoSeguro(n: string) {
  return n || 'o memorial'
}
