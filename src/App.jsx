import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import QuestionCard from './components/QuestionCard'
import Legend from './components/Legend'
import TypeFilter from './components/TypeFilter'
import ContributeForm from './components/ContributeForm'
import AuthModal from './components/AuthModal'
import AdminPanel from './components/AdminPanel'
import LoadingScreen from './components/LoadingScreen'
import PlayFilters from './components/PlayFilters'
import ResetPassword from './components/ResetPassword'
import OnboardingTour from './components/OnboardingTour'
import DailyChallenge from './components/DailyChallenge'
import DailyChallengePage from './components/DailyChallengePage'
import DailyChallengeArchive from './components/DailyChallengeArchive'
import UserProfile from './components/UserProfile'
import UsernameSetup from './components/UsernameSetup'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import EventChallenge from './components/EventChallenge'
import EventAdmin from './components/EventAdmin'
import { useQuestions } from './hooks/useQuestions'
import { useAuth } from './hooks/useAuth'
import { useDailyChallenge } from './hooks/useDailyChallenge'
import { usePlayAttempts } from './hooks/usePlayAttempts'
import { computePositions } from './utils/coordinateMapper'
import DOMAINS, { DOMAIN_KEYS } from './utils/domainConfig'
import QUESTION_TYPES from './utils/questionTypes'

function MobileFilterDropdown({ label, selectedCount, items, selected, onToggle, type }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer text-[11px]"
      >
        <span className="text-gray-300">{label}</span>
        {selectedCount > 0 && (
          <span className="text-cyan-400 font-medium">{selectedCount}</span>
        )}
        <span className="text-gray-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 glass glow-border rounded-xl p-3 max-h-[50vh] overflow-y-auto w-44 z-50">
          <div className="space-y-1">
            {items.map(item => {
              const active = selected.length === 0 || selected.includes(item.key)
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-white/5 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
                  onClick={() => onToggle(item.key)}
                >
                  {type === 'domain' && (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  )}
                  {type === 'type' && (
                    <span className="text-xs shrink-0">{item.icon}</span>
                  )}
                  <span className="text-gray-300 text-[11px] leading-tight">{type === 'domain' ? item.label.split(' & ')[0] : item.label}</span>
                </div>
              )
            })}
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => onToggle('__clear__')}
              className="mt-2 text-gray-500 hover:text-cyan-400 text-[10px] uppercase tracking-wider cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function App() {
  // Route: /daily-challenge
  const [isDailyRoute, setIsDailyRoute] = useState(() => window.location.pathname === '/daily-challenge')

  if (isDailyRoute) {
    return (
      <DailyChallengePage
        onExit={() => {
          setIsDailyRoute(false)
          window.history.pushState({}, '', '/')
        }}
      />
    )
  }

  return <MainApp />
}

function MainApp() {
  const { questions, loading, source, refetch } = useQuestions()
  const { user, profile, isAdmin, loading: authLoading, recoveryMode, setRecoveryMode, signIn, signUp, signOut, signInWithGoogle } = useAuth()
  const { attempts, recordAttempt } = usePlayAttempts(user?.id)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showEventAdmin, setShowEventAdmin] = useState(false)
  const [eventSlug, setEventSlug] = useState(null)
  const [showPlayFilters, setShowPlayFilters] = useState(false)
  const [playFilters, setPlayFilters] = useState(null) // { domains, difficultyMin, difficultyMax, types }
  const [isSpinning, setIsSpinning] = useState(false)
  const [isZooming, setIsZooming] = useState(false)
  const [zoomTarget, setZoomTarget] = useState(null)
  const [showCard, setShowCard] = useState(false)
  const [showCredits, setShowCredits] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showDaily, setShowDaily] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [localProfile, setLocalProfile] = useState(null)
  const [selectedDomains, setSelectedDomains] = useState([])
  const [selectedTypes, setSelectedTypes] = useState([])
  const spinTimeoutRef = useRef(null)
  const previousUserRef = useRef(null)
  const dailyShownOnLoginRef = useRef(false)

  // Detect ?event=slug in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ev = params.get('event')
    if (ev) setEventSlug(ev)
  }, [])

  // If event URL detected but user not signed in, show auth
  useEffect(() => {
    if (eventSlug && !user && !authLoading) {
      setShowAuth(true)
    }
  }, [eventSlug, user, authLoading])

  // Auto-open daily challenge ONLY on login if user hasn't completed it
  const { challenge: todayChallenge, attempt: todayAttempt, loading: dailyLoading } = useDailyChallenge(user?.id)
  useEffect(() => {
    // Check if user just logged in (user went from null/undefined to a valid user)
    const userJustLoggedIn = !previousUserRef.current && user
    previousUserRef.current = user

    // Show daily challenge only on login and if unattempted (but NOT when event URL is active)
    if (userJustLoggedIn && !dailyLoading && todayChallenge && !todayAttempt?.completed && !dailyShownOnLoginRef.current && !eventSlug) {
      setShowDaily(true)
      dailyShownOnLoginRef.current = true
    }

    // Reset the flag when user logs out
    if (!user) {
      dailyShownOnLoginRef.current = false
    }
  }, [dailyLoading, user, todayChallenge, todayAttempt])

  const handleToggleDomain = (key) => {
    if (key === '__clear__') {
      setSelectedDomains([])
      return
    }
    setSelectedDomains(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  const handleToggleType = (key) => {
    if (key === '__clear__') {
      setSelectedTypes([])
      return
    }
    setSelectedTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    )
  }

  // Build filters object from selected domains + types for Scene
  const sceneFilters = useMemo(() => ({
    domains: selectedDomains,
    types: selectedTypes,
  }), [selectedDomains, selectedTypes])

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
    // Spin for 1.5s, then zoom to first question
    spinTimeoutRef.current = setTimeout(() => {
      setIsSpinning(false)
      // Compute filtered pool inline to avoid stale closure
      const pool = positionedQuestions.filter(q => {
        if (filterSettings.domains.length > 0) {
          const dominantDomain = q.weights
            ? Object.entries(q.weights).sort((a, b) => b[1] - a[1])[0]?.[0]
            : null
          if (!dominantDomain || !filterSettings.domains.includes(dominantDomain)) return false
        }
        const diff = q.difficulty || 5
        if (diff < filterSettings.difficultyMin || diff > filterSettings.difficultyMax) return false
        if (filterSettings.types.length > 0 && !filterSettings.types.includes(q.type)) return false
        return true
      })
      const candidates = pool.length > 0 ? pool : positionedQuestions
      const idx = Math.floor(Math.random() * candidates.length)
      const chosen = candidates[idx]
      shownIdsRef.current.add(chosen.id)
      setSelectedQuestion({ ...chosen, _fallback: pool.length === 0 })
      setZoomTarget(chosen.position)
      setIsZooming(true)
      spinTimeoutRef.current = setTimeout(() => {
        setIsZooming(false)
        setShowCard(true)
      }, 1200)
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

  // Password recovery mode — show reset form
  if (recoveryMode) {
    return <ResetPassword onDone={() => setRecoveryMode(false)} />
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

        {/* Cosmic brand overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-[12vh] z-20 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-5 px-6 text-center">
            <h1 className="text-5xl md:text-7xl text-white font-orbitron tracking-wider glow-text leading-tight">
              QUIZIVERSE
            </h1>
            <p className="text-gray-400 text-sm max-w-md mt-2">
              Explore the interconnected universe of human thought
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="mt-6 glass glow-border px-10 py-3 rounded-full font-orbitron text-cyan-300 uppercase tracking-widest text-xs hover:scale-105 transition-transform duration-300 hover:bg-cyan-900/20 cursor-pointer"
            >
              Enter the Quiziverse
            </button>
          </div>
        </div>

        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onAuth={() => setShowAuth(false)}
            signIn={signIn}
            signUp={signUp}
            signInWithGoogle={signInWithGoogle}
          />
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 18], fov: 60 }}>
        <Scene
          onSelectQuestion={(q) => {
            setSelectedQuestion(q)
            setZoomTarget(q.position)
            setIsZooming(true)
            setTimeout(() => {
              setIsZooming(false)
              setShowCard(true)
            }, 800)
          }}
          onSunClick={() => setShowCredits(true)}
          filters={sceneFilters}
          questions={questions}
          isSpinning={isSpinning}
          isZooming={isZooming}
          zoomTarget={zoomTarget}
          attempts={attempts}
        />
      </Canvas>

      {/* Desktop: Domains + Types stacked left-side — collapsible, never overlap */}
      <div className="absolute top-4 left-4 z-20 hidden md:flex flex-col gap-2 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Legend selectedDomains={selectedDomains} onToggleDomain={handleToggleDomain} />
        <TypeFilter selectedTypes={selectedTypes} onToggleType={handleToggleType} />
      </div>

      {/* Data source indicator */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs text-gray-600">
          {source === 'supabase' ? '⚡ Supabase' : '📁 Local'}
        </span>
      </div>

      {/* Mobile filter dropdowns — top-left */}
      <div className="md:hidden absolute top-4 left-4 z-20 flex items-center gap-1.5">
        <MobileFilterDropdown
          label="Domains"
          selectedCount={selectedDomains.length}
          items={DOMAIN_KEYS.map(key => ({ key, label: DOMAINS[key].label, color: DOMAINS[key].color }))}
          selected={selectedDomains}
          onToggle={handleToggleDomain}
          type="domain"
        />
        <MobileFilterDropdown
          label="Types"
          selectedCount={selectedTypes.length}
          items={Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => ({ key, label, icon }))}
          selected={selectedTypes}
          onToggle={handleToggleType}
          type="type"
        />
      </div>

      {/* Top-right auth area */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTour(true)}
            className="px-3 py-1.5 bg-cyan-800/60 hover:bg-cyan-700/80 text-cyan-300 text-xs rounded-lg transition-colors cursor-pointer hidden md:block"
          >
            ? How to Play
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer hidden md:block"
            >
              ⚙ Admin
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer hidden md:block"
            >
              📊 Analytics
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowEventAdmin(true)}
              className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer hidden md:block"
            >
              🎯 Events
            </button>
          )}

        </div>
        {/* Mobile: How to Play + Admin below sign out */}
        <div className="md:hidden flex items-center gap-1.5">
          <button
            onClick={() => setShowTour(true)}
            className="px-2.5 py-1 bg-cyan-800/60 hover:bg-cyan-700/80 text-cyan-300 text-[10px] rounded-lg transition-colors cursor-pointer"
          >
            ? How to Play
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-500 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer"
            >
              ⚙ Admin
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer"
            >
              📊
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowEventAdmin(true)}
              className="px-2.5 py-1 bg-purple-600/80 hover:bg-purple-500 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer"
            >
              🎯
            </button>
          )}
        </div>
        <button
          className="w-9 h-9 rounded-full overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-cyan-500/50 transition-all flex items-center justify-center bg-gray-800/80"
          onClick={() => setShowProfile(true)}
          title="Profile"
        >
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-lg">{(localProfile || profile)?.avatar_emoji || '✦'}</span>
          )}
        </button>
      </div>

      {/* Bottom center actions */}
      {!showCard && !selectedQuestion && !showContribute && !showAuth && !showAdmin && !showPlayFilters && !isSpinning && !isZooming && (
        <>
          {/* Desktop: Play + Daily Challenge center */}
          <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-20 items-center gap-3">
            <button
              data-tour="play"
              onClick={() => setShowPlayFilters(true)}
              className="px-6 py-3 glass glow-border text-cyan-300 font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 hover:bg-cyan-900/20"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </button>
            <button
              onClick={() => setShowDaily(true)}
              className="px-6 py-3 glass glow-border text-amber-300 font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 hover:bg-amber-900/20"
            >
              📅 Daily Challenge
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className="px-6 py-3 glass glow-border text-purple-300 font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 hover:bg-purple-900/20"
            >
              🗓 Archives
            </button>
          </div>

          {/* Desktop: Contribute bottom-right */}
          <button
            data-tour="contribute"
            onClick={() => setShowContribute(true)}
            className="hidden md:flex absolute bottom-6 right-6 z-20 px-6 py-3 glass glow-border text-gray-300 hover:text-cyan-300 font-orbitron tracking-wider rounded-full transition-all cursor-pointer items-center gap-2 hover:bg-cyan-900/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Contribute
          </button>

          {/* Mobile: Play center bottom */}
          <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <button
              data-tour="play"
              onClick={() => setShowPlayFilters(true)}
              className="px-5 py-2.5 glass glow-border text-cyan-300 text-sm font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 hover:bg-cyan-900/20"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </button>
          </div>

          {/* Mobile: Daily Challenge + Archives bottom-left */}
          <div className="md:hidden absolute bottom-6 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => setShowDaily(true)}
              className="px-4 py-2.5 glass glow-border text-amber-300 text-sm font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 hover:bg-amber-900/20"
            >
              📅 Daily
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className="px-4 py-2 glass glow-border text-purple-300 text-[11px] font-orbitron tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-1.5 hover:bg-purple-900/20"
            >
              🗓 Archives
            </button>
          </div>

          {/* Mobile: Contribute FAB bottom-right */}
          <button
            data-tour="contribute"
            onClick={() => setShowContribute(true)}
            className="md:hidden absolute bottom-6 right-4 z-20 w-12 h-12 glass glow-border rounded-full flex items-center justify-center text-cyan-300 hover:bg-cyan-900/20 transition-all cursor-pointer shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </>
      )}

      {/* Spinning indicator */}
      {(isSpinning || isZooming) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <p className="text-cyan-400 text-sm animate-pulse font-orbitron tracking-wide">
            {isSpinning ? 'Spinning the globe...' : 'Zooming in...'}
          </p>
        </div>
      )}

      {showCard && selectedQuestion && (
        <QuestionCard
          question={selectedQuestion}
          onClose={handleClose}
          onNext={handleNext}
          isPlayMode={isPlayMode}
          attemptVerdict={attempts[selectedQuestion.id] || null}
          onRecordAttempt={recordAttempt}
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
          signInWithGoogle={signInWithGoogle}
        />
      )}

      {showAdmin && (
        <AdminPanel onClose={() => { setShowAdmin(false); refetch() }} />
      )}

      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showEventAdmin && (
        <EventAdmin onClose={() => setShowEventAdmin(false)} />
      )}

      {eventSlug && user && (
        <EventChallenge slug={eventSlug} userId={user.id} onClose={() => {
          setEventSlug(null)
          window.history.replaceState({}, '', window.location.pathname)
        }} />
      )}

      {showTour && (
        <OnboardingTour onClose={() => setShowTour(false)} />
      )}

      {showDaily && (
        <DailyChallenge userId={user.id} onClose={() => {
          setShowDaily(false)
          if (todayChallenge) {
            sessionStorage.setItem(`daily-dismissed-${todayChallenge.challenge_date}`, '1')
          }
        }} />
      )}

      {showArchive && (
        <DailyChallengeArchive
          userId={user.id}
          onSelectDate={(date) => {
            setShowArchive(false)
            setShowDaily(true)
            // Navigate to daily challenge page with date
            window.location.href = `/daily-challenge?date=${date}`
          }}
          onClose={() => setShowArchive(false)}
        />
      )}

      {showProfile && (
        <UserProfile
          user={user}
          profile={localProfile || profile}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={(updated) => setLocalProfile(updated)}
          onSignOut={signOut}
        />
      )}

      {/* Username setup — shown once for users without a username */}
      {user && !authLoading && (localProfile || profile) && !(localProfile || profile)?.username && (
        <UsernameSetup
          user={user}
          onComplete={(updates) => setLocalProfile(prev => ({ ...(prev || profile), ...updates }))}
        />
      )}

      {showPlayFilters && (
        <PlayFilters
          onStart={startPlayMode}
          onClose={() => setShowPlayFilters(false)}
          profile={profile}
        />
      )}

      {/* Credits overlay — triggered by clicking the sun */}
      {showCredits && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowCredits(false)}
        >
          <div
            className="glass glow-border rounded-2xl p-8 max-w-md w-[90%] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCredits(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl cursor-pointer"
            >
              ×
            </button>

            <div className="text-4xl mb-4">☀</div>

            <h2 className="text-white text-xl font-orbitron tracking-wider mb-2">
              QUIZIVERSE
            </h2>

            <p className="text-cyan-300/80 text-sm mb-6 italic">
              Where every question is a star, and every answer lights the way.
            </p>

            <div className="w-12 h-px bg-cyan-500/30 mx-auto mb-6" />

            <p className="text-gray-400 text-xs tracking-widest uppercase mb-2">
              Crafted by curiosity
            </p>
            <p className="text-white text-lg font-orbitron tracking-wide mb-6">
              SP & YB
            </p>

            <div className="w-12 h-px bg-cyan-500/30 mx-auto mb-6" />

            <div className="space-y-2 text-gray-500 text-xs">
              <p>Built with React · Three.js · Supabase</p>
              <p>Powered by curiosity and late nights ✦</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
