import { useState, useCallback, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Database, Folder, LogOut, Plus, Play, Shield, UserCircle } from 'lucide-react'
import QuestionCard from './components/QuestionCard'
import ContributeForm from './components/ContributeForm'
import AuthModal from './components/AuthModal'
import AdminPanel from './components/AdminPanel'
import LoadingScreen from './components/LoadingScreen'
import PlayFilters from './components/PlayFilters'
import { CursorGlow } from './components/ui/CursorGlow'
import { PlanetInfoOverlay } from './components/ui/PlanetInfoOverlay'
import { UniverseCanvas } from './components/universe/UniverseCanvas'
import { WebGLErrorBoundary } from './components/universe/WebGLErrorBoundary'
import { useQuestions } from './hooks/useQuestions'
import { useAuth } from './hooks/useAuth'
import { computePositions } from './utils/coordinateMapper'
import { PLANETS_DATA } from './data/questions'

const PLANET_DOMAIN_MAP = {
  science: ['science'],
  politics: ['society'],
  environment: ['science', 'geography'],
  technology: ['technology'],
  philosophy: ['religion', 'literature', 'society'],
  history: ['history'],
  literature: ['literature'],
  economics: ['business'],
  society: ['society'],
  arts: ['arts'],
  music: ['music'],
  popculture: ['popCulture'],
  sports: ['sports'],
  lifestyle: ['lifestyle'],
}

const DOMAIN_TO_PLANET_ID = {
  science: 'science',
  geography: 'environment',
  technology: 'technology',
  religion: 'philosophy',
  history: 'history',
  literature: 'literature',
  society: 'society',
  business: 'economics',
  arts: 'arts',
  music: 'music',
  popCulture: 'popculture',
  sports: 'sports',
  lifestyle: 'lifestyle',
}

function CosmicBrandOverlay({ onPrimaryAction, onSecondaryAction, signedIn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="absolute inset-x-0 bottom-[12vh] z-20 flex justify-center px-6 pointer-events-none"
    >
      <div className="pointer-events-auto flex max-w-2xl flex-col items-center text-center">
        <p className="font-orbitron text-xs uppercase tracking-[0.4em] text-cyan-300/80 mb-4">
          Quiziverse
        </p>
        <h1 className="text-4xl md:text-6xl text-white font-light glow-text leading-tight">
          Knowledge is not divided.
        </h1>
        <p className="mt-3 text-2xl md:text-4xl text-cyan-300 font-light glow-text">
          Every idea connects.
        </p>
        <p className="mt-6 max-w-md text-sm md:text-base text-slate-300/75">
          Explore the questions galaxy without changing the questions repo beneath it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onPrimaryAction}
            className="glass glow-border inline-flex items-center gap-2 rounded-full px-6 py-3 font-orbitron text-xs uppercase tracking-widest text-cyan-200 transition-transform duration-300 hover:scale-105 hover:bg-cyan-900/20"
          >
            <Play className="h-4 w-4" />
            {signedIn ? 'Enter Cosmos' : 'Sign In'}
          </button>
          {!signedIn && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-orbitron text-xs uppercase tracking-widest text-slate-200 transition-colors hover:bg-white/10"
            >
              Create Account
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

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
  const [showCard, setShowCard] = useState(false)
  const [showHero, setShowHero] = useState(false)
  const [activePlanet, setActivePlanet] = useState(null)
  const [cameraZ] = useState(34)
  const spinTimeoutRef = useRef(null)

  // Pre-compute positions so we know where each question lives
  const positionedQuestions = useMemo(() => computePositions(questions), [questions])

  const zoomTarget = useMemo(() => {
    if (!selectedQuestion) return null

    if (selectedQuestion._planetName) {
      const byName = PLANETS_DATA.find(
        (planet) => planet.name.toLowerCase() === String(selectedQuestion._planetName).toLowerCase()
      )
      if (byName) return byName.position
    }

    const dominantDomain = selectedQuestion.weights
      ? Object.entries(selectedQuestion.weights).sort((a, b) => b[1] - a[1])[0]?.[0]
      : null

    const mappedPlanetId = dominantDomain ? DOMAIN_TO_PLANET_ID[dominantDomain] : null
    if (!mappedPlanetId) return null

    return PLANETS_DATA.find((planet) => planet.id === mappedPlanetId)?.position || null
  }, [selectedQuestion])

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

  const chooseQuestionFromPool = useCallback((pool, fallbackPool = positionedQuestions) => {
    let available = pool.filter(q => !shownIdsRef.current.has(q.id))
    let usedFallback = false

    if (available.length === 0) {
      available = fallbackPool.filter(q => !shownIdsRef.current.has(q.id))
      usedFallback = true
    }

    if (available.length === 0) {
      shownIdsRef.current.clear()
      available = pool.length > 0 ? pool : fallbackPool
    }

    const chosen = available[Math.floor(Math.random() * available.length)]
    if (!chosen) return null
    shownIdsRef.current.add(chosen.id)
    return { ...chosen, _fallback: usedFallback }
  }, [positionedQuestions])

  const pickRandomAndZoom = useCallback(() => {
    const chosen = chooseQuestionFromPool(filteredPool, positionedQuestions)
    if (!chosen) return
    setSelectedQuestion(chosen)
    setIsZooming(true)
    // Zoom takes ~1s, then show card
    spinTimeoutRef.current = setTimeout(() => {
      setIsZooming(false)
      setShowCard(true)
    }, 1200)
  }, [chooseQuestionFromPool, filteredPool, positionedQuestions])

  const startPlanetQuiz = useCallback((planet) => {
    const domains = PLANET_DOMAIN_MAP[planet.id] || []
    const planetPool = positionedQuestions.filter((q) => {
      if (!q.weights) return false
      return domains.some((domain) => (q.weights[domain] || 0) >= 5)
    })
    const chosen = chooseQuestionFromPool(planetPool, positionedQuestions)
    if (!chosen) return

    setActivePlanet(null)
    setShowHero(false)
    setSelectedQuestion({
      ...chosen,
      _planetName: planet.name,
      _planetColor: planet.color,
    })
    setIsPlayMode(true)
    setShowCard(true)
  }, [chooseQuestionFromPool, positionedQuestions])

  const handlePlanetClick = useCallback((planet) => {
    setShowHero(false)
    setSelectedQuestion(null)
    setShowCard(false)
    setActivePlanet(planet)
  }, [])

  const handleBeaconQuestion = useCallback(() => {
    // Keep Cosmic's ambient beacon animation, but do not interrupt the quiz page
    // with an automatic question modal.
  }, [])

  const startPlayMode = (filterSettings) => {
    setPlayFilters(filterSettings)
    setShowHero(false)
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
    setIsSpinning(true)
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false)
      pickRandomAndZoom()
    }, 1500)
  }

  const handleClose = () => {
    setSelectedQuestion(null)
    setActivePlanet(null)
    setIsPlayMode(false)
    setIsSpinning(false)
    setIsZooming(false)
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
      <div className="w-full h-full min-h-screen relative overflow-hidden bg-[#000008]">
        <WebGLErrorBoundary>
          <UniverseCanvas
            cameraZ={cameraZ}
            onPlanetClick={() => setShowAuth(true)}
            onBeaconQuestion={() => {}}
            isSpinning={false}
            isZooming={false}
            zoomTarget={null}
          />
        </WebGLErrorBoundary>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-cyan-950/20 to-transparent" />
        <div className="absolute left-5 top-5 z-20 glass rounded-lg px-4 py-3">
          <div className="font-orbitron text-sm uppercase tracking-[0.32em] text-cyan-300">
            Quiziverse
          </div>
          <div className="mt-1 text-xs text-slate-400">The Knowledge Galaxy</div>
        </div>

        <CosmicBrandOverlay
          signedIn={false}
          onPrimaryAction={() => setShowAuth(true)}
          onSecondaryAction={() => setShowAuth(true)}
        />
        <CursorGlow />

        <div className="absolute bottom-4 left-4 z-20 hidden max-w-xs rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-400 backdrop-blur md:block">
          <span className="text-cyan-300">Frontend shell:</span> Cosmic Mindscape. <span className="text-slate-500">Workflow:</span> Quiziverse.
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

  const idle = !activePlanet && !showCard && !selectedQuestion && !showContribute && !showAuth && !showAdmin && !showPlayFilters && !isSpinning && !isZooming

  return (
    <div className="w-full h-full min-h-screen relative overflow-hidden bg-[#000008]">
      <WebGLErrorBoundary>
        <UniverseCanvas
          cameraZ={cameraZ}
          onPlanetClick={handlePlanetClick}
          onBeaconQuestion={handleBeaconQuestion}
          isSpinning={isSpinning}
          isZooming={isZooming}
          zoomTarget={isZooming ? zoomTarget : null}
        />
      </WebGLErrorBoundary>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-cyan-950/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-black/60 to-transparent" />

      <CursorGlow />

      <AnimatePresence>
        {showHero && idle && (
          <CosmicBrandOverlay
            signedIn={true}
            onPrimaryAction={() => setShowHero(false)}
          />
        )}
      </AnimatePresence>

      {/* Data source indicator */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-300">
          {source === 'supabase' ? <Database className="h-3.5 w-3.5 text-cyan-300" /> : <Folder className="h-3.5 w-3.5 text-cyan-300" />}
          {source === 'supabase' ? 'Supabase' : 'Local questions'}
        </div>
      </div>

      {/* Top-right auth area */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="glass flex items-center gap-2 rounded-full px-2 py-2">
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-amber-500/15 px-3 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/25"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/5 px-3 text-xs text-slate-200 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
        <div className="glass inline-flex max-w-[min(18rem,calc(100vw-2rem))] items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-300">
          <UserCircle className="h-3.5 w-3.5 text-cyan-300" />
          <span className="truncate">{profile?.display_name || user.email}</span>
        </div>
      </div>

      {/* Bottom center — Play button */}
      {idle && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <button
            onClick={() => {
              setShowHero(false)
              setShowPlayFilters(true)
            }}
            className="glass glow-border inline-flex items-center gap-2 rounded-full px-6 py-3 font-orbitron text-xs uppercase tracking-widest text-cyan-200 transition-transform duration-300 hover:scale-105 hover:bg-cyan-900/20"
          >
            <Play className="h-4 w-4" />
            Play
          </button>
        </div>
      )}

      {/* Spinning indicator */}
      {(isSpinning || isZooming) && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-full px-4 py-2 text-sm text-cyan-200"
          >
            {isSpinning ? 'Spinning the globe...' : 'Zooming in...'}
          </motion.p>
        </div>
      )}

      {/* Bottom right — Contribute */}
      {!selectedQuestion && !showContribute && !showAuth && !showAdmin && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={() => {
              setShowHero(false)
              setShowContribute(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            Contribute
          </button>
        </div>
      )}

      <PlanetInfoOverlay
        planet={activePlanet}
        onClose={() => setActivePlanet(null)}
        onStartQuiz={startPlanetQuiz}
      />

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
