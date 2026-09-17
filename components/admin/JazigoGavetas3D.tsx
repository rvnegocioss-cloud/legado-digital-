'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import Link from 'next/link'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Jazigo subterrâneo em corte (2026-09-17, wireframe aprovado pelo Rafael a
// partir de uma imagem de referência): chão de grama com abertura no meio,
// câmara aberta na frente, corredor central e gavetas nos dois lados.
// Coluna 1 = lado esquerdo, coluna 2 = lado direito, Gaveta/andar 1 em cima.
// Sem tampa removível (pedido explícito).

export interface GavetaInfo {
  id: string
  codigo: string
  linha: number
  coluna: number
  observacoes: string | null
  nome_sem_memorial?: string | null
  homenagem: { nome_completo: string; slug: string; foto_url?: string | null } | null
}

type Tipo = 'memorial' | 'nome' | 'vaga'

function tipoDa(g: GavetaInfo): Tipo {
  if (g.homenagem) return 'memorial'
  if (g.nome_sem_memorial?.trim()) return 'nome'
  return 'vaga'
}

function nomeDa(g: GavetaInfo) {
  return g.homenagem?.nome_completo || g.nome_sem_memorial?.trim() || 'Vaga'
}

const COR: Record<Tipo, string> = { memorial: '#C9A46A', nome: '#8f8f8f', vaga: '#d9d9d9' }
const COR_TEXTO: Record<Tipo, string> = { memorial: '#C9A46A', nome: '#e5e5e5', vaga: '#8a99a6' }

// Medidas da cena (unidades livres, proporção de uma gaveta real ~ 0,8 × 2,2 m)
const LARG_GAVETA = 1.8
const CORREDOR = 1.0
const PROF = 2.4
const ANDAR = 0.9
const PAREDE = 0.15
const TERRA = 0.6
const TOPO = 0.35 // espessura terra + grama acima da câmara
const POS_INICIAL: [number, number, number] = [5.5, 2.5, 9]
const estiloBotao = {
  fontSize: 12,
  color: '#F5F2EB',
  background: 'rgba(11,29,42,0.85)',
  border: '1px solid #C9A46A',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
} as const

export default function JazigoGavetas3D({
  gavetas,
  onEditar,
}: {
  gavetas: GavetaInfo[]
  onEditar?: (gavetaId: string) => void
}) {
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [girando, setGirando] = useState(false)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  const andares = Math.max(1, ...gavetas.map((g) => g.linha || 1))
  const altCamara = andares * ANDAR + 0.3
  const meiaLarg = CORREDOR / 2 + LARG_GAVETA
  const centroY = -TOPO - altCamara / 2
  const selecionada = gavetas.find((g) => g.id === selecionadaId) || null
  const ocupadas = gavetas.filter((g) => tipoDa(g) !== 'vaga').length

  const posicao = useMemo(
    () => (g: GavetaInfo) => {
      const x = (g.coluna === 2 ? 1 : -1) * (CORREDOR / 2 + LARG_GAVETA / 2)
      const y = -TOPO - 0.25 - (g.linha - 1) * ANDAR - ANDAR * 0.55
      return [x, y, 0] as [number, number, number]
    },
    []
  )

  function camera(pos: [number, number, number]) {
    const c = controlsRef.current
    if (!c) return
    c.object.position.set(...pos)
    c.target.set(0, centroY, 0)
    c.update()
  }

  function zoom(fator: number) {
    const c = controlsRef.current
    if (!c) return
    const alvo = c.target
    c.object.position.sub(alvo).multiplyScalar(fator).add(alvo)
    c.update()
  }

  const concreto = '#c9c6bf'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-8">
        <div style={{ position: 'relative', width: '100%', height: 520, background: '#0B1D2A', borderRadius: 12, overflow: 'hidden' }}>
          <Canvas camera={{ position: POS_INICIAL, fov: 42 }} onPointerMissed={() => setSelecionadaId(null)}>
            <color attach="background" args={['#0B1D2A']} />
            <ambientLight intensity={0.75} />
            <directionalLight position={[6, 10, 8]} intensity={1.1} />

            {/* Grama e terra acima da câmara, com a abertura do corredor no meio */}
            {[-1, 1].map((lado) => {
              const larg = LARG_GAVETA + TERRA
              const x = lado * (CORREDOR / 2 + larg / 2)
              return (
                <group key={lado}>
                  <mesh position={[x, -0.04, 0]}>
                    <boxGeometry args={[larg, 0.08, PROF + TERRA]} />
                    <meshStandardMaterial color="#5f9e4a" />
                  </mesh>
                  <mesh position={[x, -0.08 - (TOPO - 0.08) / 2, 0]}>
                    <boxGeometry args={[larg, TOPO - 0.08, PROF + TERRA]} />
                    <meshStandardMaterial color="#5a4632" />
                  </mesh>
                </group>
              )
            })}
            {/* Grama atrás da abertura (a abertura só existe sobre o corredor) */}
            <mesh position={[0, -0.04, -(PROF + TERRA) / 2 + TERRA / 4]}>
              <boxGeometry args={[CORREDOR, 0.08, TERRA / 2]} />
              <meshStandardMaterial color="#5f9e4a" />
            </mesh>

            {/* Terra em volta da câmara: laterais, fundo e base (frente aberta = corte) */}
            {[-1, 1].map((lado) => (
              <mesh key={`t${lado}`} position={[lado * (meiaLarg + TERRA / 2), centroY, -TERRA / 4]}>
                <boxGeometry args={[TERRA, altCamara, PROF + TERRA / 2]} />
                <meshStandardMaterial color="#4a3a2a" />
              </mesh>
            ))}
            <mesh position={[0, centroY, -PROF / 2 - TERRA / 4]}>
              <boxGeometry args={[meiaLarg * 2, altCamara, TERRA / 2]} />
              <meshStandardMaterial color="#4a3a2a" />
            </mesh>
            <mesh position={[0, -TOPO - altCamara - TERRA / 4, -TERRA / 4]}>
              <boxGeometry args={[meiaLarg * 2 + TERRA * 2, TERRA / 2, PROF + TERRA / 2]} />
              <meshStandardMaterial color="#4a3a2a" />
            </mesh>

            {/* Câmara de concreto por dentro */}
            <mesh position={[0, centroY, -PROF / 2 + PAREDE / 2]}>
              <boxGeometry args={[meiaLarg * 2, altCamara, PAREDE]} />
              <meshStandardMaterial color={concreto} />
            </mesh>
            {[-1, 1].map((lado) => (
              <mesh key={`p${lado}`} position={[lado * (meiaLarg - PAREDE / 2), centroY, 0]}>
                <boxGeometry args={[PAREDE, altCamara, PROF]} />
                <meshStandardMaterial color={concreto} />
              </mesh>
            ))}
            <mesh position={[0, -TOPO - altCamara + PAREDE / 2, 0]}>
              <boxGeometry args={[meiaLarg * 2, PAREDE, PROF]} />
              <meshStandardMaterial color="#b5b1a8" />
            </mesh>

            {/* Gavetas */}
            {gavetas.map((g) => {
              const tipo = tipoDa(g)
              const [x, y, z] = posicao(g)
              const sel = g.id === selecionadaId
              const ladoDireito = g.coluna === 2
              return (
                <group key={g.id}>
                  <mesh
                    position={[x, y, z]}
                    onClick={(e: ThreeEvent<MouseEvent>) => {
                      e.stopPropagation()
                      setSelecionadaId(g.id)
                    }}
                    onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                      e.stopPropagation()
                      document.body.style.cursor = 'pointer'
                    }}
                    onPointerOut={() => {
                      document.body.style.cursor = 'default'
                    }}
                  >
                    <boxGeometry args={[LARG_GAVETA - 0.2, 0.14, PROF - 0.3]} />
                    <meshStandardMaterial
                      color={COR[tipo]}
                      emissive={sel ? '#ffffff' : '#000000'}
                      emissiveIntensity={sel ? 0.25 : 0}
                    />
                  </mesh>
                  <Html
                    position={[ladoDireito ? meiaLarg + TERRA + 0.1 : -(meiaLarg + TERRA + 0.1), y, PROF / 2]}
                    style={{ transform: ladoDireito ? 'translate(0,-50%)' : 'translate(-100%,-50%)', pointerEvents: 'none' }}
                  >
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        fontWeight: tipo === 'vaga' ? 400 : 600,
                        color: COR_TEXTO[tipo],
                        background: 'rgba(11,29,42,0.85)',
                        border: `1px solid ${sel ? '#ffffff' : 'rgba(201,164,106,0.35)'}`,
                        borderRadius: 6,
                        padding: '2px 7px',
                      }}
                    >
                      {g.codigo} · {nomeDa(g)}
                    </span>
                  </Html>
                </group>
              )
            })}

            <OrbitControls
              ref={controlsRef}
              target={[0, centroY, 0]}
              enableDamping
              autoRotate={girando}
              autoRotateSpeed={1.2}
            />
          </Canvas>

          <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" style={estiloBotao} onClick={() => setGirando((v) => !v)}>
              {girando ? 'Parar de girar' : '↻ Girar'}
            </button>
            <button type="button" style={estiloBotao} onClick={() => zoom(0.8)}>
              + Zoom
            </button>
            <button type="button" style={estiloBotao} onClick={() => zoom(1.25)}>
              − Zoom
            </button>
            <button type="button" style={estiloBotao} onClick={() => camera([0, centroY, 11])}>
              Vista de frente
            </button>
            <button type="button" style={estiloBotao} onClick={() => camera(POS_INICIAL)}>
              Vista em ângulo
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--tema-zinc-400)]">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COR.memorial }} />Tem memorial</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COR.nome }} />Pessoa sem memorial</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COR.vaga }} />Vaga</span>
          <span>Arraste pra girar · rolagem do mouse dá zoom · clique numa gaveta</span>
        </div>
      </div>

      <div className="lg:col-span-4 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5">
        {selecionada ? (
          <>
            <p className="text-sm font-semibold text-white mb-3">{selecionada.codigo}</p>
            {selecionada.homenagem && (
              <div className="w-14 h-14 rounded-full overflow-hidden mb-3 bg-[var(--tema-zinc-800)]" style={{ border: '2px solid #C9A46A' }}>
                {selecionada.homenagem.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlMidiaProtegida(selecionada.homenagem.foto_url) || selecionada.homenagem.foto_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <dl className="text-sm divide-y divide-[var(--tema-zinc-800)]">
              <div className="flex justify-between py-1.5"><dt className="text-[var(--tema-zinc-400)]">Quem está</dt><dd className="text-white text-right">{nomeDa(selecionada)}</dd></div>
              <div className="flex justify-between py-1.5"><dt className="text-[var(--tema-zinc-400)]">Andar</dt><dd className="text-white">{selecionada.linha}º (de cima pra baixo)</dd></div>
              <div className="flex justify-between py-1.5"><dt className="text-[var(--tema-zinc-400)]">Lado</dt><dd className="text-white">{selecionada.coluna === 2 ? 'direito (coluna 2)' : 'esquerdo (coluna 1)'}</dd></div>
            </dl>
            {selecionada.observacoes && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">{selecionada.observacoes}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              {selecionada.homenagem && (
                <Link
                  href={`/homenagem/${selecionada.homenagem.slug}`}
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
                >
                  Abrir página do memorial
                </Link>
              )}
              {onEditar && (
                <button
                  type="button"
                  onClick={() => onEditar(selecionada.id)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)] hover:text-white"
                >
                  Editar gaveta
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--tema-zinc-400)]">Clique numa gaveta pra ver quem está ali.</p>
        )}
        <p className="text-sm text-[var(--tema-zinc-300)] mt-5 pt-4 border-t border-[var(--tema-zinc-800)]">
          <strong className="text-white">Ocupação:</strong> {ocupadas} de {gavetas.length} ocupada(s) · {gavetas.length - ocupadas} vaga(s)
        </p>
      </div>
    </div>
  )
}
