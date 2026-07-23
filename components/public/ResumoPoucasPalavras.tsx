import { CORES } from '@/lib/publicTheme'

interface Props {
  cidade: string | null
  anos: string | null
  totalTimeline: number
  totalFotos: number
}

// Card lateral "Em poucas palavras" — derivado de dado que já existe
// (cidade, período de vida, quantidade de marcos/fotos), sem precisar
// de campo novo no formulário de edição. Só aparece se tiver algo real
// pra mostrar (mesma regra das outras seções da página).
export function ResumoPoucasPalavras({ cidade, anos, totalTimeline, totalFotos }: Props) {
  const linhas: string[] = []
  if (cidade) linhas.push(cidade)
  if (anos) linhas.push(anos)
  if (totalTimeline > 0) linhas.push(`${totalTimeline} ${totalTimeline === 1 ? 'marco' : 'marcos'} na linha do tempo`)
  if (totalFotos > 0) linhas.push(`${totalFotos} ${totalFotos === 1 ? 'foto guardada' : 'fotos guardadas'}`)

  if (linhas.length === 0) return null

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: `1px solid ${CORES.douradoBorda}`,
        borderRadius: 12,
        padding: 24,
        alignSelf: 'start',
      }}
    >
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: CORES.dourado, marginBottom: 12 }}>
        Em poucas palavras
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: CORES.textoCorpo }}>
        {linhas.map((linha, i) => (
          <div key={i}>{linha}</div>
        ))}
      </div>
    </div>
  )
}
