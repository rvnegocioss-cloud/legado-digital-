'use client'

import { useEffect, useRef, useState } from 'react'

// A regua da vida: os anos vividos como uma barra vertical, com um ponto pra
// cada marco da linha do tempo. Marca onde a pessoa esta enquanto rola e leva
// pro trecho ao clicar.
//
// Existe porque a queixa real da pagina antiga era "comprido demais" -- num
// memorial longo, o visitante perde a nocao de onde esta na vida da pessoa.
// Um menu de secoes resolveria a navegacao, mas nao diria nada; a regua diz
// quanto tempo a pessoa viveu e como os marcos se distribuem nele.
//
// Ilha client isolada: a pagina segue 100% servidor, sem requestAnimationFrame
// (mesma regra da pagina base -- ver CLAUDE.md).

export interface MarcoVida {
  /** Ancora do marco na pagina, ex: "marco-2" */
  id: string
  ano: string
  titulo: string
  /** 0 a 1 -- posicao proporcional dentro dos anos vividos */
  posicao: number
}

export function RailVida({
  marcos,
  anoInicio,
  anoFim,
}: {
  marcos: MarcoVida[]
  anoInicio: string | null
  anoFim: string | null
}) {
  const [ativo, setAtivo] = useState<string | null>(null)
  const [reduzMovimento, setReduzMovimento] = useState(false)
  const observador = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    setReduzMovimento(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (marcos.length === 0) return

    observador.current = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visivel) setAtivo(visivel.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )

    marcos.forEach((m) => {
      const el = document.getElementById(m.id)
      if (el) observador.current?.observe(el)
    })

    return () => observador.current?.disconnect()
  }, [marcos])

  if (marcos.length === 0 || !anoInicio || !anoFim) return null

  return (
    <nav className="perfil-rail" aria-label="Marcos da vida">
      <span className="perfil-rail-ano">{anoInicio}</span>

      <div className="perfil-rail-trilho">
        <span className="perfil-rail-linha" aria-hidden="true" />
        {marcos.map((m) => {
          const estaAtivo = ativo === m.id
          return (
            <a
              key={m.id}
              href={`#${m.id}`}
              className={`perfil-rail-ponto${estaAtivo ? ' perfil-rail-ponto-ativo' : ''}`}
              style={{ top: `${m.posicao * 100}%` }}
              onClick={(e) => {
                if (reduzMovimento) return
                e.preventDefault()
                document.getElementById(m.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              <span className="perfil-rail-marca" aria-hidden="true" />
              <span className="perfil-rail-etiqueta">
                <em>{m.ano}</em>
                {m.titulo}
              </span>
            </a>
          )
        })}
      </div>

      <span className="perfil-rail-ano">{anoFim}</span>
    </nav>
  )
}
