import { useMemo } from 'react'
import { OrbitControls, Stars } from '@react-three/drei'
import StarNode from './StarNode'
import questions from '../data/questions.json'
import { computePositions } from '../utils/coordinateMapper'

function matchesFilters(question, filters) {
  const entries = Object.entries(filters)
  if (entries.length === 0) return true
  return entries.some(([domain, minWeight]) => (question.weights[domain] || 0) >= minWeight)
}

function Scene({ onSelectQuestion, filters }) {
  const positionedQuestions = useMemo(() => computePositions(questions), [])

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
        minDistance={3}
        maxDistance={30}
      />
    </>
  )
}

export default Scene
