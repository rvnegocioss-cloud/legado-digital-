'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

function LogoModel() {
  const { scene } = useGLTF('/3d/logo-icone.glb')
  const ref = useRef<THREE.Group>(null!)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#C9A46A',
          metalness: 0.6,
          roughness: 0.3,
          emissive: '#a8834a',
          emissiveIntensity: 0.2,
        })
      }
    })
  }, [scene])

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime
      const pulse = 1 + Math.sin(t * 0.6) * 0.18
      ref.current.scale.setScalar(pulse)
    }
  })

  return (
    <Center>
      <group ref={ref}>
        <primitive object={scene} scale={2.4} />
      </group>
    </Center>
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
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} color="#F5F2EB" />
        <directionalLight position={[-3, -2, -4]} intensity={0.5} color="#C9A46A" />
        <LogoModel />
        <EffectComposer>
          <Bloom luminanceThreshold={0.3} intensity={0.6} mipmapBlur radius={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

useGLTF.preload('/3d/logo-icone.glb')
