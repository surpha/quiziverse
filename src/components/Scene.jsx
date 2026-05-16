import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import StarNode from './StarNode'
import { computePositions } from '../utils/coordinateMapper'
import { getDominantDomain } from '../utils/domainConfig'
import DOMAINS from '../utils/domainConfig'

function matchesFilters(question, filters) {
  const entries = Object.entries(filters)
  if (entries.length === 0) return true
  return entries.some(([domain, minWeight]) => (question.weights[domain] || 0) >= minWeight)
}

/** Concentric wireframe spheres showing difficulty orbits */
function OrbitShells() {
  const radii = [2.0, 2.9, 3.8, 4.7, 5.6, 6.4, 7.3, 8.2, 9.1, 10.0]
  return (
    <>
      {radii.map((r, i) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe opacity={i % 3 === 0 ? 0.06 : 0.03} transparent />
        </mesh>
      ))}
    </>
  )
}

/**
 * Draw faint lines connecting questions that share the same primary domain,
 * forming visual "constellations". Only connects nearest neighbors (max distance).
 */
function ConstellationLines({ questions, filters }) {
  const lines = useMemo(() => {
    // Group questions by primary domain
    const groups = {}
    for (const q of questions) {
      if (!matchesFilters(q, filters)) continue
      const dom = getDominantDomain(q.weights)
      if (!groups[dom]) groups[dom] = []
      groups[dom].push(q)
    }

    const result = []
    const maxDist = 5.0 // Only connect nearby nodes

    for (const [domain, members] of Object.entries(groups)) {
      if (members.length < 2) continue
      const color = DOMAINS[domain]?.color || '#a78bfa'

      // Connect each node to its nearest neighbor in the same domain
      for (let i = 0; i < members.length; i++) {
        let bestDist = Infinity
        let bestJ = -1
        for (let j = 0; j < members.length; j++) {
          if (i === j) continue
          const dx = members[i].position[0] - members[j].position[0]
          const dy = members[i].position[1] - members[j].position[1]
          const dz = members[i].position[2] - members[j].position[2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < bestDist && dist < maxDist) {
            bestDist = dist
            bestJ = j
          }
        }
        if (bestJ !== -1) {
          // Avoid duplicate lines (only add if i < bestJ)
          const key = i < bestJ ? `${i}-${bestJ}` : `${bestJ}-${i}`
          if (!result.find(l => l.key === `${domain}-${key}`)) {
            result.push({
              key: `${domain}-${key}`,
              points: [
                new THREE.Vector3(...members[i].position),
                new THREE.Vector3(...members[bestJ].position),
              ],
              color,
            })
          }
        }
      }
    }
    return result
  }, [questions, filters])

  return (
    <>
      {lines.map(({ key, points, color }) => (
        <line key={key}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...points[0].toArray(), ...points[1].toArray()])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.12} />
        </line>
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

        {/* Constellation lines connecting same-domain questions */}
        <ConstellationLines questions={positionedQuestions} filters={filters} />

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
        maxDistance={50}
      />
    </>
  )
}

export default Scene
