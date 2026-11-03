'use client'

import { useEffect } from 'react'

// "Fio da vida": conforme a página desce, cada bolinha da linha do tempo
// acende em dourado quando passa de ~70% da altura da tela, e o fio dourado
// cresce junto até a última acesa. Voltando pra cima, apagam na ordem inversa.
// Ilha client mínima: a página do memorial segue 100% servidor.
export default function AcendeMarcos() {
  useEffect(() => {
    const lista = document.querySelector<HTMLElement>('#timeline .perfil-linha-tempo')
    if (!lista) return
    const marcos = Array.from(lista.querySelectorAll<HTMLElement>('.perfil-marco'))
    if (marcos.length === 0) return

    let pendente = false
    const atualizar = () => {
      pendente = false
      const linha = window.innerHeight * 0.7
      const topoLista = lista.getBoundingClientRect().top
      let ultimo = -1
      marcos.forEach((m, i) => {
        const no = m.querySelector<HTMLElement>('.perfil-marco-no')
        if (!no) return
        const acesa = no.getBoundingClientRect().top < linha
        no.classList.toggle('acesa', acesa)
        if (acesa) ultimo = i
      })
      const no = ultimo >= 0 ? marcos[ultimo].querySelector<HTMLElement>('.perfil-marco-no') : null
      const alto = no ? no.getBoundingClientRect().top - topoLista + 6 : 0
      lista.style.setProperty('--fio-aceso', `${Math.max(0, alto)}px`)
    }
    const agendar = () => {
      if (pendente) return
      pendente = true
      requestAnimationFrame(atualizar)
    }

    atualizar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [])

  return null
}
