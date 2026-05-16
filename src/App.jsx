import { useState, useCallback } from 'react'
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

function App() {
  const { questions, loading, source, refetch } = useQuestions()
  const { user, profile, isAdmin, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [filters, setFilters] = useState({}) // { domain: minWeight }
  const [isPlayMode, setIsPlayMode] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const pickRandom = useCallback(() => {
    if (questions.length === 0) return
    const idx = Math.floor(Math.random() * questions.length)
    setSelectedQuestion(questions[idx])
  }, [questions])

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

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-purple-400 text-lg animate-pulse">Loading Quiziverse…</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
        <Scene onSelectQuestion={setSelectedQuestion} filters={filters} questions={questions} />
      </Canvas>

      <Legend />
      <FilterPanel filters={filters} onFiltersChange={setFilters} />

      {/* Data source indicator */}
      <div className="absolute bottom-4 left-4 z-10">
        <span className="text-xs text-gray-600">
          {source === 'supabase' ? '⚡ Supabase' : '📁 Local'}
        </span>
      </div>

      {/* Top-right auth area */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {authLoading ? null : user ? (
          <>
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                ⚙ Admin
              </button>
            )}
            <span className="text-gray-400 text-xs truncate max-w-[120px]">{user.email}</span>
            <button
              onClick={signOut}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
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

      {/* Bottom action buttons */}
      {!selectedQuestion && !showContribute && !showAuth && !showAdmin && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          <button
            onClick={startPlayMode}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-full shadow-lg shadow-purple-500/30 transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Random Play
          </button>
          <button
            onClick={() => setShowContribute(true)}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-full shadow-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Contribute
          </button>
        </div>
      )}

      {selectedQuestion && (
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
