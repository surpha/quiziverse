import { useMemo } from 'react'
import { OrbitControls, Stars, Ring } from '@react-three/drei'
import StarNode from './StarNode'
import { computePositions } from '../utils/coordinateMapper'

function matchesFilters(question, filters) {
  const entries = Object.entries(filters)
  if (entries.length === 0) return true
  return entries.some(([domain, minWeight]) => (question.weights[domain] || 0) >= minWeight)
}

/** Concentric wireframe spheres showing difficulty orbits */
function OrbitShells() {
  const radii = [2.0, 3.0, 4.0, 5.0, 6.0] // matches difficultyToRadius mapping
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

function Scene({ onSelectQuestion, filters, questions }) {
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

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={35}
      />
    </>
  )
}

export default Scene
