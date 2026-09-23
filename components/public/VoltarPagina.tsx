'use client'

import Link from 'next/link'
import { useVoltar } from '@/lib/useVoltar'

// "← Voltar" das páginas internas do site. Volta pra página de onde a pessoa
// veio (lib/useVoltar.ts); só cai em `fallback` quando não existe página
// anterior dentro do site (QR Code, link direto). O `href` continua real:
// clique com botão do meio, "abrir em nova aba" e leitor de tela seguem
// funcionando -- só o clique simples é interceptado.
export default function VoltarPagina({
  fallback,
  className = 'voltar',
  children = '← Voltar',
}: {
  fallback: string
  className?: string
  children?: React.ReactNode
}) {
  const voltar = useVoltar(fallback)

  return (
    <Link
      href={fallback}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        voltar()
      }}
    >
      {children}
    </Link>
  )
}
