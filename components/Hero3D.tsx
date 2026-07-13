'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

const VERTEX_SHADER = `
  attribute float aRandom;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    float twinkle = 0.5 + 0.5 * sin(uTime * (0.5 + aRandom * 0.4) + aRandom * 6.28);
    vAlpha = twinkle;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (16.0 + aRandom * 10.0) * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * 1.6, glow * vAlpha);
  }
`

const POINT_COUNT = 70
const CONNECTION_DISTANCE = 2.0
const MAX_CONNECTIONS_PER_POINT = 3

function Constellation() {
  const groupRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const { pointer } = useThree()

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(POINT_COUNT * 3)
    const rnd = new Float32Array(POINT_COUNT)
    for (let i = 0; i < POINT_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 9
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5
      rnd[i] = Math.random()
    }
    return [pos, rnd]
  }, [])

  const lineSegments = useMemo(() => {
    const segments: [number, number, number][][] = []
    const connCount = new Array(POINT_COUNT).fill(0)
    for (let i = 0; i < POINT_COUNT; i++) {
      for (let j = i + 1; j < POINT_COUNT; j++) {
        if (connCount[i] >= MAX_CONNECTIONS_PER_POINT || connCount[j] >= MAX_CONNECTIONS_PER_POINT) continue
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < CONNECTION_DISTANCE) {
          segments.push([
            [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
            [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]],
          ])
          connCount[i]++
          connCount[j]++
        }
      }
    }
    return segments
  }, [positions])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#C9A46A') },
    }),
    []
  )

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (groupRef.current) {
      const targetY = 0.15 + pointer.x * 0.25
      const targetX = Math.sin(state.clock.elapsedTime * 0.1) * 0.08 - pointer.y * 0.15
      groupRef.current.rotation.y += delta * 0.04
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03
      groupRef.current.position.x += ((pointer.x * 0.3) - groupRef.current.position.x) * 0.02
      void targetY
    }
  })

  return (
    <group ref={groupRef}>
      {lineSegments.map((points, i) => (
        <Line key={i} points={points} color="#C9A46A" lineWidth={1.1} transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

export default function HeroBackground() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
  }, [])

  if (reducedMotion) {
    return (
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201,164,106,0.12) 0%, transparent 60%)',
        }}
      />
    )
  }

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Constellation />
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} intensity={1.1} mipmapBlur radius={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
