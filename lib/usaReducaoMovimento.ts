'use client'

import { useSyncExternalStore } from 'react'

// "O sistema pede menos movimento?" lido do jeito que o React manda ler estado
// que mora fora dele.
//
// A forma obvia -- useState + useEffect com setState no corpo do efeito --
// dispara render em cascata e o lint do React reprova (react-hooks/
// set-state-in-effect). useSyncExternalStore resolve: le o valor na hora do
// render e se inscreve na mudanca, sem efeito nenhum.
//
// No servidor devolve false: renderiza a versao com movimento e o cliente
// corrige no primeiro render se for o caso. O CSS ja tem
// @media (prefers-reduced-motion: reduce) como rede de seguranca, entao mesmo
// nesse instante nada se move de verdade.

const CONSULTA = '(prefers-reduced-motion: reduce)'

function inscrever(aoMudar: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', aoMudar)
  return () => mq.removeEventListener('change', aoMudar)
}

function lerNoCliente() {
  return window.matchMedia(CONSULTA).matches
}

function lerNoServidor() {
  return false
}

export function usaReducaoMovimento(): boolean {
  return useSyncExternalStore(inscrever, lerNoCliente, lerNoServidor)
}
