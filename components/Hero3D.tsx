'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

const VERTEX_SHADER = `
  attribute float aRandom;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    float speed = 0.3 + aRandom * 0.05;
    float cycle = mod(uTime * speed + aRandom * 10.0, 8.0);
    pos.y = mod(position.y + cycle, 8.0) - 4.0;
    pos.x += sin(uTime * 0.5 + aRandom * 6.28) * 0.4;
    vAlpha = smoothstep(0.0, 1.0, cycle) * smoothstep(8.0, 6.0, cycle);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (14.0 + aRandom) * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float glow = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, glow * vAlpha * 0.85);
  }
`

const PARTICLE_COUNT = 800

function RisingEmbers() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const rnd = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 3 + Math.random() * 2.5
      const angle = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = Math.sin(angle) * radius * 0.6
      rnd[i] = Math.random() * 10
    }
    return [pos, rnd]
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#C9A46A') },
    }),
    []
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
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
      />
    </points>
  )
}

function GlowCore() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime
      const scale = 1 + Math.sin(t * 1.2) * 0.08
      ref.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshBasicMaterial color="#C9A46A" transparent opacity={0.25} />
    </mesh>
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
        <RisingEmbers />
        <GlowCore />
      </Canvas>
    </div>
  )
}
