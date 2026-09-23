'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

// "Voltar" padrão de site: volta pra página de ONDE A PESSOA VEIO, não pra um
// destino fixo. Regra do Rafael (2026-09-23) depois de achado real: clicou na
// cruz do mapa do cemitério, abriu o memorial, apertou a seta e caiu na
// landing em vez de voltar pro mapa.
//
// Por que o código antigo errava: decidia "veio de fora do site?" olhando
// `document.referrer`. Esse valor é fixado no carregamento inicial da aba e
// NÃO muda quando o Next navega por dentro (router.push). Quem abria o mapa
// direto por link ficava com referrer vazio/externo pra sempre e todo "voltar"
// virava "ir pra home", mesmo depois de clicar em vários links do site.
//
// Como decide agora:
//   1. `navigation.canGoBack` (Navigation API, Baseline 2026): só enxerga
//      entradas de histórico do MESMO site. true = existe página anterior
//      dentro do site -> router.back(). Página anterior de outro site (Google,
//      WhatsApp) não conta, então cai no fallback e a pessoa não é jogada pra
//      fora do Legado Digital.
//   2. Navegador sem a API: usa `history.length > 1`. Pode voltar pra fora do
//      site nesse caso raro, o que é o comportamento normal do botão voltar.
//   3. Sem página anterior (QR Code, link direto, aba nova): vai pro `fallback`,
//      o pai lógico da página (ex: lista de cemitérios, home).
export function useVoltar(fallback: string = '/') {
  const router = useRouter()

  return useCallback(() => {
    const nav = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation
    const temAnterior =
      typeof nav?.canGoBack === 'boolean' ? nav.canGoBack : window.history.length > 1

    if (temAnterior) router.back()
    else router.push(fallback)
  }, [router, fallback])
}
