import type { Object3DNode, MaterialNode, BufferGeometryNode } from '@react-three/fiber'
import type * as THREE from 'three'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      primitive: { object: THREE.Object3D | THREE.BufferAttribute; attach?: string; [key: string]: unknown }
      points: Object3DNode<THREE.Points, typeof THREE.Points>
      bufferGeometry: BufferGeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
      pointsMaterial: MaterialNode<THREE.PointsMaterial, [THREE.PointsMaterialParameters]>
      torusKnotGeometry: Object3DNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>
    }
  }
}
