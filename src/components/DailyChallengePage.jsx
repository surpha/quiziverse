import { useState, useEffect } from 'react'
import DailyChallenge from './DailyChallenge'
import DailyChallengeArchive from './DailyChallengeArchive'
import { useDailyChallengeByDate } from '../hooks/useDailyChallengeByDate'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'
import LoadingScreen from './LoadingScreen'

// Get today's date in user's local timezone as YYYY-MM-DD
function getToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Standalone page for /daily-challenge route.
 * Shows today's challenge by default, or a specific date from ?date= param.
 * Includes archive calendar access.
 */
export default function DailyChallengePage({ onExit }) {
  const { user, profile, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('date') || null
  })

  // When playing an archive date (not today), use the date-specific hook
  const isArchiveMode = selectedDate && selectedDate !== getToday()
  const { challenge: archiveChallenge, loading: archiveLoading } = useDailyChallengeByDate(
    user?.id,
    isArchiveMode ? selectedDate : null
  )

  // Show auth if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuth(true)
    }
  }, [authLoading, user])

  if (authLoading) return <LoadingScreen />

  if (!user) {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center relative">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">📅</div>
          <h1 className="text-3xl text-white font-orbitron tracking-wider mb-3">Daily Challenge</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to play today's daily challenge</p>
          <button
            onClick={() => setShowAuth(true)}
            className="glass glow-border px-8 py-3 rounded-full font-orbitron text-cyan-300 uppercase tracking-widest text-xs hover:scale-105 transition-transform cursor-pointer"
          >
            Sign In
          </button>
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

  const handleSelectArchiveDate = (date) => {
    setSelectedDate(date)
    setShowArchive(false)
    // Update URL without reload
    const url = new URL(window.location)
    url.searchParams.set('date', date)
    window.history.pushState({}, '', url)
  }

  const handleBackToToday = () => {
    setSelectedDate(null)
    const url = new URL(window.location)
    url.searchParams.delete('date')
    window.history.pushState({}, '', url)
  }

  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden">
      {/* Subtle background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/10 via-transparent to-purple-950/10 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <button
          onClick={onExit}
          className="text-gray-400 hover:text-cyan-300 text-sm flex items-center gap-1 cursor-pointer transition-colors"
        >
          ← Back to Quiziverse
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchive(true)}
            className="px-3 py-1.5 glass rounded-lg text-gray-300 hover:text-cyan-300 text-xs cursor-pointer transition-colors flex items-center gap-1"
          >
            📅 Archives
          </button>
          {isArchiveMode && (
            <button
              onClick={handleBackToToday}
              className="px-3 py-1.5 glass rounded-lg text-cyan-300 text-xs cursor-pointer transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Date indicator for archive mode */}
      {isArchiveMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
          <span className="text-amber-300 text-xs font-orbitron tracking-wider bg-amber-900/30 px-3 py-1 rounded-full">
            Archive: {selectedDate}
          </span>
        </div>
      )}

      {/* Daily challenge content */}
      {isArchiveMode ? (
        // Archive challenge uses the DailyChallenge component with date-specific data
        archiveLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-cyan-400 text-sm animate-pulse font-orbitron">Loading challenge...</p>
          </div>
        ) : (
          <DailyChallenge
            key={selectedDate}
            userId={user.id}
            date={selectedDate}
            onClose={handleBackToToday}
          />
        )
      ) : (
        <DailyChallenge
          key="today"
          userId={user.id}
          onClose={onExit}
        />
      )}

      {/* Archive overlay */}
      {showArchive && (
        <DailyChallengeArchive
          userId={user.id}
          onSelectDate={handleSelectArchiveDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  )
}
