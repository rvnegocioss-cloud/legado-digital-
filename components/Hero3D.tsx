'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, Environment, MeshDistortMaterial } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

function FloatingParticles() {
  const positions = useMemo(() => {
    const temp = new Float32Array(100 * 3)
    for (let i = 0; i < 100; i++) {
      temp[i * 3] = (Math.random() - 0.5) * 20
      temp[i * 3 + 1] = (Math.random() - 0.5) * 20
      temp[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return temp
  }, [])

  const positionAttr = useMemo(() => new THREE.BufferAttribute(positions, 3), [positions])

  const ref = useRef<THREE.Points>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <primitive object={positionAttr} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#e2b714"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function CenterOrb() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
      ref.current.rotation.y += 0.005
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref}>
        <torusKnotGeometry args={[1, 0.4, 128, 16]} />
        <MeshDistortMaterial
          color="#e2b714"
          emissive="#c9a84c"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
          wireframe
        />
      </mesh>
    </Float>
  )
}

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        <FloatingParticles />
        <CenterOrb />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 2, 0]} color="#e2b714" intensity={1} />
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}