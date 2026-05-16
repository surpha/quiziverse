import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import QuestionCard from './components/QuestionCard'
import Legend from './components/Legend'
import FilterPanel from './components/FilterPanel'
import questions from './data/questions.json'

function App() {
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filters, setFilters] = useState({}) // { domain: minWeight }
  const [isPlayMode, setIsPlayMode] = useState(false)

  const pickRandom = useCallback(() => {
    const idx = Math.floor(Math.random() * questions.length)
    setSelectedQuestion(questions[idx])
  }, [])

  const startPlayMode = () => {
    setIsPlayMode(true)
    pickRandom()
  }

  const handleNext = () => {
    pickRandom()
  }

  const handleClose = () => {
    setSelectedQuestion(null)
    setIsPlayMode(false)
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <Scene onSelectQuestion={setSelectedQuestion} filters={filters} />
      </Canvas>

      <Legend />
      <FilterPanel filters={filters} onFiltersChange={setFilters} />

      {/* Random Play button */}
      {!selectedQuestion && (
        <button
          onClick={startPlayMode}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full shadow-lg shadow-purple-500/30 transition-colors cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Random Play
        </button>
      )}

      {selectedQuestion && (
        <QuestionCard
          question={selectedQuestion}
          onClose={handleClose}
          onNext={handleNext}
          isPlayMode={isPlayMode}
        />
      )}
    </div>
  )
}

export default App
