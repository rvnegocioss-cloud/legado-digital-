'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useVoltar } from '@/lib/useVoltar'

interface Props {
  style: React.CSSProperties
  logoStyle: React.CSSProperties
}

// Seta do topo do memorial: volta pra página de ONDE A PESSOA VEIO (busca,
// mapa do cemitério, outro memorial). Sem página anterior dentro do site
// (chegou direto por QR Code/link), cai na home.
//
// Corrigido em 2026-09-23: a versão anterior decidia "veio de fora?" por
// `document.referrer`, que não muda em navegação interna do Next -- quem
// clicava na cruz do mapa, abria o memorial e apertava a seta caía na
// landing. A decisão agora mora em lib/useVoltar.ts (Navigation API).
//
// A logo ao lado continua levando pra home; o texto "Voltar pro site" fica
// em botão próprio (page.tsx), pra seta e logo nunca serem o mesmo link.
export default function VoltarLink({ style, logoStyle }: Props) {
  const voltar = useVoltar('/')

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={voltar}
        aria-label="Voltar para a página anterior"
        title=""
        style={{
          ...style,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 15,
        }}
      >
        ←
      </button>
      <Link href="/" aria-label="Legado Digital — ir para o início" style={style}>
        <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={220} height={86} style={logoStyle} />
      </Link>
    </span>
  )
}
