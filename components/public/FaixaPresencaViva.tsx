import { CORES } from '@/lib/publicTheme'

interface Props {
  velas: number
  homenagens: number
  memorias: number
}

// Faixa "presença viva" — números elegantes, sem ícone de rede social.
// Server Component (sem interatividade), fica logo abaixo do hero.
export function FaixaPresencaViva({ velas, homenagens, memorias }: Props) {
  const itens = [
    { valor: velas, label: 'velas acesas' },
    { valor: homenagens, label: 'homenagens' },
    { valor: memorias, label: 'memórias guardadas' },
  ]

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderTop: `1px solid ${CORES.douradoBorda}`,
        borderBottom: `1px solid ${CORES.douradoBorda}`,
        padding: '22px 20px',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 20,
          textAlign: 'center',
        }}
      >
        {itens.map((item) => (
          <div key={item.label}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: CORES.dourado }}>{item.valor}</div>
            <div style={{ fontSize: 12, letterSpacing: 1, color: CORES.textoFraco, marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
