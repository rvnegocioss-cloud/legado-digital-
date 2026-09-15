'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  style: React.CSSProperties
  logoStyle: React.CSSProperties
}

// A seta do topo do memorial ia direto pra landing -- pedido do Rafael: tem
// que voltar pra página de onde a pessoa veio (busca, mapa do cemitério,
// outro memorial), não sempre pro site. Sem histórico de navegação dentro
// do site (ex: chegou direto por QR Code/link), cai no site mesmo -- não
// tem "página anterior" real pra voltar.
export default function VoltarLink({ style, logoStyle }: Props) {
  const router = useRouter()

  function aoClicar(e: React.MouseEvent) {
    e.preventDefault()
    const veioDeFora = !document.referrer || new URL(document.referrer).origin !== window.location.origin
    if (veioDeFora || window.history.length <= 1) {
      router.push('/')
    } else {
      router.back()
    }
  }

  return (
    <Link href="/" onClick={aoClicar} aria-label="Voltar" style={style}>
      <span style={{ fontSize: 15 }}>←</span>
      <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={220} height={86} style={logoStyle} />
    </Link>
  )
}
