import { CORES } from '@/lib/publicTheme'

// Mesma resposta (texto, layout, status) tanto pra slug inexistente quanto
// pra memorial oculto ou com canal desligado — nunca "acesso restrito"
// nem qualquer diferença perceptível, senão vira enumeração (dá pra
// descobrir que um memorial existe e está oculto só testando a URL).
export function GateNaoEncontrado() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: CORES.fundoBase,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ textAlign: 'center', fontFamily: 'Georgia, serif' }}>
        <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Memorial não encontrado.</p>
        <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
      </div>
    </div>
  )
}
