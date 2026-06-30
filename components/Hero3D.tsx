'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars, Environment, MeshDistortMaterial } from '@react-three/drei'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

function FloatingParticles() {
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 20
      const y = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 20
      temp.push(x, y, z)
    }
    return new Float32Array(temp)
  }, [])

  const ref = useRef<THREE.Points>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1
    }
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(particles, 3))
    return geo
  }, [particles])

  return (
    <points ref={ref} geometry={geometry}>
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