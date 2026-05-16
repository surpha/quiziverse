import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import StarNode from './StarNode'
import { computePositions } from '../utils/coordinateMapper'

function matchesFilters(question, filters) {
  const entries = Object.entries(filters)
  if (entries.length === 0) return true
  return entries.some(([domain, minWeight]) => (question.weights[domain] || 0) >= minWeight)
}

/** Concentric wireframe spheres showing difficulty orbits */
function OrbitShells() {
  const radii = [2.0, 3.0, 4.0, 5.0, 6.0]
  return (
    <>
      {radii.map((r) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe opacity={0.04} transparent />
        </mesh>
      ))}
    </>
  )
}

/** Wrapper group that spins when isSpinning is true */
function SpinningGlobe({ children, isSpinning }) {
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (groupRef.current && isSpinning) {
      groupRef.current.rotation.y += delta * 4.0
      groupRef.current.rotation.x += delta * 1.5
    }
  })

  return <group ref={groupRef}>{children}</group>
}

/** Smoothly zooms camera toward a target position */
function CameraZoom({ target, active }) {
  const { camera } = useThree()
  const targetVec = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    if (!active || !target) return

    // Position camera offset from the target (slightly back)
    targetVec.current.set(target[0], target[1], target[2] + 3)

    // Lerp camera position toward target
    camera.position.lerp(targetVec.current, delta * 3.0)
    camera.lookAt(target[0], target[1], target[2])
  })

  return null
}

function Scene({ onSelectQuestion, filters, questions, isSpinning, isZooming, zoomTarget }) {
  const positionedQuestions = useMemo(() => computePositions(questions), [questions])

  return (
    <>
      {/* Ambient lighting for visibility */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      {/* Starfield background */}
      <Stars
        radius={50}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* Camera zoom animation */}
      <CameraZoom target={zoomTarget} active={isZooming} />

      {/* Globe content that spins during random play */}
      <SpinningGlobe isSpinning={isSpinning}>
        {/* Difficulty orbit shells */}
        <OrbitShells />

        {/* Question nodes */}
        {positionedQuestions.map((q) => (
          <StarNode
            key={q.id}
            question={q}
            position={q.position}
            onSelect={onSelectQuestion}
            dimmed={!matchesFilters(q, filters)}
          />
        ))}
      </SpinningGlobe>

      {/* Camera controls — disabled during spin/zoom */}
      <OrbitControls
        enablePan={!isSpinning && !isZooming}
        enableZoom={!isSpinning && !isZooming}
        enableRotate={!isSpinning && !isZooming}
        minDistance={2}
        maxDistance={35}
      />
    </>
  )
}

export default Scene
