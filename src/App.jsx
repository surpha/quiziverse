import { useState, useCallback, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import QuestionCard from './components/QuestionCard'
import Legend from './components/Legend'
import FilterPanel from './components/FilterPanel'
import ContributeForm from './components/ContributeForm'
import AuthModal from './components/AuthModal'
import AdminPanel from './components/AdminPanel'
import { useQuestions } from './hooks/useQuestions'
import { useAuth } from './hooks/useAuth'
import { computePositions } from './utils/coordinateMapper'

function App() {
  const { questions, loading, source, refetch } = useQuestions()
  const { user, profile, isAdmin, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filters, setFilters] = useState({}) // { domain: minWeight }
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomTarget, setZoomTarget] = useState(null)
  const [showCard, setShowCard] = useState(false)
  const spinTimeoutRef = useRef(null)

  // Pre-compute positions so we know where each question lives
  const positionedQuestions = useMemo(() => computePositions(questions), [questions])

  const pickRandomAndZoom = useCallback(() => {
    if (positionedQuestions.length === 0) return
    const idx = Math.floor(Math.random() * positionedQuestions.length)
    const chosen = positionedQuestions[idx]
    setSelectedQuestion(chosen)
    setZoomTarget(chosen.position)
    setIsZooming(true)
    // Zoom takes ~1s, then show card
    spinTimeoutRef.current = setTimeout(() => {
      setIsZooming(false)
      setShowCard(true)
    }, 1200)
  }, [positionedQuestions])

  const startPlayMode = () => {
    setIsPlayMode(true)
    setShowCard(false)
    setIsSpinning(true)
    // Spin for 1.5s, then zoom to question
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false)
      pickRandomAndZoom()
    }, 1500)
  }

  const handleNext = () => {
    setShowCard(false)
    setSelectedQuestion(null)
    setZoomTarget(null)
    setIsSpinning(true)
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false)
      pickRandomAndZoom()
    }, 1500)
  }

  const handleClose = () => {
    setSelectedQuestion(null)
    setIsPlayMode(false)
    setIsSpinning(false)
    setIsZooming(false)
    setZoomTarget(null)
    setShowCard(false)
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-purple-400 text-lg animate-pulse">Loading Quiziverse…</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
        <Scene
          onSelectQuestion={(q) => { setSelectedQuestion(q); setShowCard(true) }}
          filters={filters}
          questions={questions}
          isSpinning={isSpinning}
          isZooming={isZooming}
          zoomTarget={zoomTarget}
        />
      </Canvas>

      <Legend />

      {/* Data source indicator */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs text-gray-600">
          {source === 'supabase' ? '⚡ Supabase' : '📁 Local'}
        </span>
      </div>

      {/* Top-right auth area */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
        {authLoading ? null : user ? (
          <>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  ⚙ Admin
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
            <span className="text-gray-500 text-xs">{user.email}</span>
          </>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Bottom center — Random Play + Filter */}
      {!showCard && !selectedQuestion && !showContribute && !showAuth && !showAdmin && !isSpinning && !isZooming && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-end gap-3">
          <FilterPanel filters={filters} onFiltersChange={setFilters} />
          <button
            onClick={startPlayMode}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full shadow-lg shadow-purple-500/30 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Random Play
          </button>
        </div>
      )}

      {/* Spinning indicator */}
      {(isSpinning || isZooming) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <p className="text-purple-400 text-sm animate-pulse">
            {isSpinning ? 'Spinning the globe...' : 'Zooming in...'}
          </p>
        </div>
      )}

      {/* Bottom right — Contribute */}
      {!selectedQuestion && !showContribute && !showAuth && !showAdmin && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={() => setShowContribute(true)}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm font-medium rounded-full shadow-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Contribute
          </button>
        </div>
      )}

      {showCard && selectedQuestion && (
        <QuestionCard
          question={selectedQuestion}
          onClose={handleClose}
          onNext={handleNext}
          isPlayMode={isPlayMode}
        />
      )}

      {showContribute && (
        <ContributeForm
          onClose={() => setShowContribute(false)}
          onSubmitted={refetch}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={() => setShowAuth(false)}
          signIn={signIn}
          signUp={signUp}
        />
      )}

      {showAdmin && (
        <AdminPanel onClose={() => { setShowAdmin(false); refetch() }} />
      )}
    </div>
  )
}

export default App
