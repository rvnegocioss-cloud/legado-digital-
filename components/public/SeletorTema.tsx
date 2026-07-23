'use client'

import { useState } from 'react'
import {
  PALETAS_MEMORIAL,
  VAR_FUNDO_TOPO,
  VAR_FUNDO_BASE,
  VAR_FUNDO_PROFUNDO,
  VAR_DOURADO,
  VAR_DOURADO_CLARO,
  VAR_DOURADO_ESCURO,
} from '@/lib/temasMemorial'

// Seletor de tema (demo pros sócios) — troca só a cor de fundo/acento na hora,
// via CSS custom properties no <html>. Não salva escolha nenhuma (efêmero,
// some ao recarregar a página). Estrutura da página não muda, só a cor.
export function SeletorTema() {
  const [ativo, setAtivo] = useState('navy')

  function aplicar(paletaId: string) {
    const paleta = PALETAS_MEMORIAL.find((p) => p.id === paletaId)
    if (!paleta) return

    const raiz = document.documentElement
    raiz.style.setProperty(VAR_FUNDO_TOPO, paleta.fundoTopo)
    raiz.style.setProperty(VAR_FUNDO_BASE, paleta.fundoBase)
    raiz.style.setProperty(VAR_FUNDO_PROFUNDO, paleta.fundoProfundo)
    raiz.style.setProperty(VAR_DOURADO, paleta.dourado)
    raiz.style.setProperty(VAR_DOURADO_CLARO, paleta.douradoClaro)
    raiz.style.setProperty(VAR_DOURADO_ESCURO, paleta.douradoEscuro)

    setAtivo(paletaId)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 40,
        display: 'flex',
        gap: 8,
        background: 'rgba(0,0,0,0.35)',
        padding: 8,
        borderRadius: 999,
        backdropFilter: 'blur(6px)',
      }}
    >
      {PALETAS_MEMORIAL.map((paleta) => (
        <button
          key={paleta.id}
          onClick={() => aplicar(paleta.id)}
          aria-label={`Ver com paleta ${paleta.nome}`}
          title={paleta.nome}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: ativo === paleta.id ? '2px solid #fff' : '2px solid transparent',
            cursor: 'pointer',
            padding: 0,
            background: `linear-gradient(135deg, ${paleta.fundoBase} 50%, ${paleta.dourado} 50%)`,
          }}
        />
      ))}
    </div>
  )
}
