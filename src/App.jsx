import { useState, useCallback, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import QuestionCard from './components/QuestionCard'
import Legend from './components/Legend'
import ContributeForm from './components/ContributeForm'
import AuthModal from './components/AuthModal'
import AdminPanel from './components/AdminPanel'
import LoadingScreen from './components/LoadingScreen'
import PlayFilters from './components/PlayFilters'
import { useQuestions } from './hooks/useQuestions'
import { useAuth } from './hooks/useAuth'
import { computePositions } from './utils/coordinateMapper'

function App() {
  const { questions, loading, source, refetch } = useQuestions()
  const { user, profile, isAdmin, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showPlayFilters, setShowPlayFilters] = useState(false)
  const [playFilters, setPlayFilters] = useState(null) // { domains, difficultyMin, difficultyMax, types }
  const [isSpinning, setIsSpinning] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomTarget, setZoomTarget] = useState(null)
  const [showCard, setShowCard] = useState(false)
  const spinTimeoutRef = useRef(null)

  // Pre-compute positions so we know where each question lives
  const positionedQuestions = useMemo(() => computePositions(questions), [questions])

  // Filter pool based on play filters
  const filteredPool = useMemo(() => {
    if (!playFilters) return positionedQuestions
    return positionedQuestions.filter(q => {
      // Domain filter: question's dominant domain must be in selected domains
      if (playFilters.domains.length > 0) {
        const dominantDomain = q.weights
          ? Object.entries(q.weights).sort((a, b) => b[1] - a[1])[0]?.[0]
          : null
        if (!dominantDomain || !playFilters.domains.includes(dominantDomain)) return false
      }
      // Difficulty filter
      const diff = q.difficulty || 5
      if (diff < playFilters.difficultyMin || diff > playFilters.difficultyMax) return false
      // Type filter
      if (playFilters.types.length > 0 && !playFilters.types.includes(q.type)) return false
      return true
    })
  }, [positionedQuestions, playFilters])

  // Track which questions have been shown this session
  const shownIdsRef = useRef(new Set())

  const pickRandomAndZoom = useCallback(() => {
    // Try filtered pool first, excluding already-shown
    let pool = filteredPool.filter(q => !shownIdsRef.current.has(q.id))
    let usedFallback = false
    if (pool.length === 0 && playFilters) {
      // Fallback: pick from all questions
      pool = positionedQuestions.filter(q => !shownIdsRef.current.has(q.id))
      usedFallback = true
    }
    if (pool.length === 0) {
      // All questions shown — reset
      shownIdsRef.current.clear()
      pool = filteredPool.length > 0 ? filteredPool : positionedQuestions
    }
    const idx = Math.floor(Math.random() * pool.length)
    const chosen = pool[idx]
    shownIdsRef.current.add(chosen.id)
    setSelectedQuestion({ ...chosen, _fallback: usedFallback })
    setZoomTarget(chosen.position)
    setIsZooming(true)
    // Zoom takes ~1s, then show card
    spinTimeoutRef.current = setTimeout(() => {
      setIsZooming(false)
      setShowCard(true)
    }, 1200)
  }, [filteredPool, positionedQuestions, playFilters])

  const startPlayMode = (filterSettings) => {
    setPlayFilters(filterSettings)
    shownIdsRef.current.clear()
    setShowPlayFilters(false)
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
    setPlayFilters(null)
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current)
  }

  if (loading || authLoading) {
    return <LoadingScreen />
  }

  // Not signed in — show landing page with spinning globe + sign-in
  if (!user) {
    return (
      <div className="w-full h-full relative">
        <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
          <Scene
            onSelectQuestion={() => {}}
            filters={{}}
            questions={[]}
            isSpinning={true}
            isZooming={false}
            zoomTarget={null}
          />
        </Canvas>

        {/* Brand overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-6 px-6">
            <h1 className="text-5xl font-bold tracking-wider">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                QUIZIVERSE
              </span>
            </h1>
            <p className="text-gray-400 text-sm tracking-wide text-center max-w-xs">
              Explore the knowledge galaxy. Sign in to play, contribute, and discover.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full shadow-lg shadow-purple-500/30 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-full shadow-lg transition-colors cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={() => setShowAuth(false)}
            signIn={signIn}
            signUp={signUp}
          />
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
        <Scene
          onSelectQuestion={(q) => { setSelectedQuestion(q); setShowCard(true) }}
          filters={{}}
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
        <span className="text-gray-500 text-xs flex items-center gap-1.5">
          <span className="text-sm">{profile?.avatar_emoji || '✦'}</span>
          {profile?.display_name || user.email}
        </span>
      </div>

      {/* Bottom center — Play button */}
      {!showCard && !selectedQuestion && !showContribute && !showAuth && !showAdmin && !showPlayFilters && !isSpinning && !isZooming && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setShowPlayFilters(true)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full shadow-lg shadow-purple-500/30 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
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

      {showPlayFilters && (
        <PlayFilters
          onStart={startPlayMode}
          onClose={() => setShowPlayFilters(false)}
          profile={profile}
        />
      )}
    </div>
  )
}

export default App
