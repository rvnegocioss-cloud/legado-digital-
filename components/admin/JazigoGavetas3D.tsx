'use client'

import { useMemo, useState } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Link from 'next/link'
import { X } from 'lucide-react'

interface GavetaInfo {
  id: string
  codigo: string
  linha: number
  coluna: number
  observacoes: string | null
  homenagem: { nome_completo: string; slug: string } | null
}

function GavetaMesh({ gaveta, x, y, z, largura, profundidade, onSelecionar }: {
  gaveta: GavetaInfo
  x: number
  y: number
  z: number
  largura: number
  profundidade: number
  onSelecionar: (g: GavetaInfo) => void
}) {
  const ocupada = !!gaveta.homenagem
  const cor = ocupada ? '#C9A46A' : '#d8d4c8'

  function clicar(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    onSelecionar(gaveta)
  }

  return (
    <mesh
      position={[x, y, z]}
      onClick={clicar}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      <boxGeometry args={[largura, 0.1, profundidade]} />
      <meshStandardMaterial color={cor} />
    </mesh>
  )
}

export default function JazigoGavetas3D({ gavetas }: { gavetas: GavetaInfo[] }) {
  const [selecionada, setSelecionada] = useState<GavetaInfo | null>(null)

  const { colunas, linhas, larguraTotal, profundidade, alturaGaveta, alturaTotal } = useMemo(() => {
    const linhasUnicas = Array.from(new Set(gavetas.map((g) => g.linha))).sort((a, b) => a - b)
    const colunasUnicas = Array.from(new Set(gavetas.map((g) => g.coluna))).sort((a, b) => a - b)
    const linhas = Math.max(1, linhasUnicas.length)
    const colunas = Math.max(1, colunasUnicas.length, ...gavetas.map((g) => g.coluna))
    const larguraTotal = colunas === 2 ? 4.4 : 2.4
    const profundidade = 2.2
    const alturaGaveta = 0.9
    const alturaTotal = linhas * alturaGaveta + 0.4
    return { colunas, linhas, larguraTotal, profundidade, alturaGaveta, alturaTotal }
  }, [gavetas])

  const espessura = 0.15
  const larguraGavetaCol = (larguraTotal - espessura * (colunas + 1)) / colunas

  function posicaoX(coluna: number) {
    if (colunas < 2) return 0
    return coluna === 1 ? -(larguraGavetaCol / 2 + espessura / 2) : (larguraGavetaCol / 2 + espessura / 2)
  }

  function posicaoY(linha: number) {
    return -0.4 - linha * alturaGaveta + alturaGaveta * 0.15
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 520, background: '#0B1D2A', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, color: '#F5F2EB', fontSize: 12, background: 'rgba(11,29,42,0.75)', border: '1px solid #C9A46A', borderRadius: 8, padding: '8px 12px', maxWidth: 260 }}>
        Arraste com o mouse pra girar, scroll pra zoom. Clique numa gaveta pra ver quem está ali.
      </div>

      <Canvas camera={{ position: [6, 5, 9], fov: 45 }}>
        <color attach="background" args={['#0B1D2A']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 6]} intensity={1.1} />

        {/* Grama */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[larguraTotal + 1.2, 0.15, profundidade + 1.2]} />
          <meshStandardMaterial color="#3a6b3a" />
        </mesh>
        {/* Terra */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[larguraTotal + 1.2, 0.4, profundidade + 1.2]} />
          <meshStandardMaterial color="#4a3524" />
        </mesh>

        {/* Estrutura de concreto */}
        <mesh position={[0, -alturaTotal / 2 - 0.4, -profundidade / 2]}>
          <boxGeometry args={[larguraTotal, alturaTotal, espessura]} />
          <meshStandardMaterial color="#b8b3a8" />
        </mesh>
        <mesh position={[-larguraTotal / 2, -alturaTotal / 2 - 0.4, 0]}>
          <boxGeometry args={[espessura, alturaTotal, profundidade]} />
          <meshStandardMaterial color="#b8b3a8" />
        </mesh>
        <mesh position={[larguraTotal / 2, -alturaTotal / 2 - 0.4, 0]}>
          <boxGeometry args={[espessura, alturaTotal, profundidade]} />
          <meshStandardMaterial color="#b8b3a8" />
        </mesh>
        <mesh position={[0, -alturaTotal - 0.4, 0]}>
          <boxGeometry args={[larguraTotal, espessura, profundidade]} />
          <meshStandardMaterial color="#b8b3a8" />
        </mesh>
        {colunas === 2 && (
          <mesh position={[0, -alturaTotal / 2 - 0.4, 0]}>
            <boxGeometry args={[espessura, alturaTotal, profundidade]} />
            <meshStandardMaterial color="#b8b3a8" />
          </mesh>
        )}

        {gavetas.map((g) => (
          <GavetaMesh
            key={g.id}
            gaveta={g}
            x={posicaoX(g.coluna)}
            y={posicaoY(g.linha)}
            z={0.1}
            largura={larguraGavetaCol}
            profundidade={profundidade - 0.3}
            onSelecionar={setSelecionada}
          />
        ))}

        <OrbitControls target={[0, -1.5, 0]} enableDamping />
      </Canvas>

      {selecionada && (
        <div
          style={{
            position: 'absolute', top: 12, right: 12, width: 260, zIndex: 10,
            background: 'rgba(11,29,42,0.95)', border: '1px solid #C9A46A', borderRadius: 10,
            padding: 16, color: '#F5F2EB',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#C9A46A', fontWeight: 600 }}>{selecionada.codigo}</span>
            <button onClick={() => setSelecionada(null)} aria-label="Fechar" style={{ background: 'transparent', border: 'none', color: '#7a8a96', cursor: 'pointer' }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          {selecionada.homenagem ? (
            <>
              <p style={{ fontSize: 14, margin: 0 }}>{selecionada.homenagem.nome_completo}</p>
              <Link href={`/homenagem/${selecionada.homenagem.slug}`} className="hover:underline" style={{ fontSize: 12, color: '#C9A46A' }}>
                Ver memorial →
              </Link>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#7a8a96', margin: 0 }}>Gaveta vaga</p>
          )}
          {selecionada.observacoes && (
            <p style={{ fontSize: 12, color: '#7a8a96', marginTop: 8 }}>{selecionada.observacoes}</p>
          )}
        </div>
      )}
    </div>
  )
}
