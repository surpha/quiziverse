import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { getBlendedColor } from '../utils/domainConfig'

function StarNode({ question, position, onSelect, dimmed = false }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const { color, emissive } = getBlendedColor(question.weights)

  // Gentle pulsing animation + dim transition
  useFrame((state) => {
    if (meshRef.current) {
      const baseScale = dimmed ? 0.5 : 1
      const pulse = hovered ? 1.4 : baseScale + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1
      meshRef.current.scale.setScalar(pulse)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (!dimmed) onSelect(question)
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); if (!dimmed) { setHovered(true); document.body.style.cursor = 'pointer' } }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={hovered ? '#ffffff' : dimmed ? '#333333' : color}
        emissive={hovered ? color : dimmed ? '#111111' : emissive}
        emissiveIntensity={hovered ? 1.5 : dimmed ? 0.1 : 0.7}
        transparent={dimmed}
        opacity={dimmed ? 0.3 : 1}
      />
    </mesh>
  )
}

export default StarNode
