import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiveQuiz } from '../hooks/useLiveQuiz'
import LiveQuizLeaderboard from './LiveQuizLeaderboard'

export default function LiveQuizPlayer({ slug, userId, profile, onExit }) {
  const { quiz, response, loading, error, joinQuiz, saveAnswers } = useLiveQuiz(slug, userId)
  const [answers, setAnswers] = useState([])
  const [joined, setJoined] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const debounceRef = useRef(null)

  // Initialize answers from response
  useEffect(() => {
    if (response?.answers) {
      setAnswers(response.answers)
      setJoined(true)
    }
  }, [response])

  // Auto-join when quiz is live
  useEffect(() => {
    if (quiz && quiz.status === 'live' && userId && !joined && !response) {
      joinQuiz().then(() => setJoined(true))
    }
  }, [quiz, userId, joined, response])

  // Debounced autosave
  const debouncedSave = useCallback((newAnswers) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      await saveAnswers(newAnswers)
      setSaving(false)
      setLastSaved(new Date())
    }, 1000)
  }, [saveAnswers])

  const handleAnswerChange = (index, value) => {
    const updated = answers.map((a, i) =>
      i === index ? { ...a, answer: value } : a
    )
    setAnswers(updated)
    debouncedSave(updated)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-950 flex items-center justify-center">
        <p className="text-cyan-400 text-sm animate-pulse font-orbitron">Loading quiz...</p>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">🚫</div>
        <p className="text-white text-lg font-orbitron">{error || 'Quiz not found'}</p>
        <button onClick={onExit} className="text-cyan-300 text-sm cursor-pointer hover:underline">← Go back</button>
      </div>
    )
  }

  // Results mode — show leaderboard
  if (quiz.status === 'results') {
    return <LiveQuizLeaderboard quiz={quiz} userId={userId} onExit={onExit} />
  }

  // Locked — waiting for evaluation
  if (quiz.status === 'locked' || quiz.status === 'evaluating') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl animate-pulse">🔒</div>
        <h2 className="text-white text-xl font-orbitron tracking-wider text-center">Quiz Locked</h2>
        <p className="text-gray-400 text-sm text-center max-w-md">
          {quiz.status === 'evaluating'
            ? 'Answers are being evaluated. Results will appear shortly...'
            : 'The quizmaster has locked answers. Waiting for evaluation...'}
        </p>
        <div className="mt-4 text-gray-500 text-xs">
          Your answers have been submitted. Sit tight!
        </div>
      </div>
    )
  }

  // Draft — not yet live
  if (quiz.status === 'draft') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">⏳</div>
        <h2 className="text-white text-xl font-orbitron tracking-wider text-center">{quiz.title}</h2>
        <p className="text-gray-400 text-sm text-center">This quiz hasn't started yet. Wait for the quizmaster to go live.</p>
        <button onClick={onExit} className="mt-4 text-cyan-300 text-sm cursor-pointer hover:underline">← Go back</button>
      </div>
    )
  }

  // LIVE — answer boxes
  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/10 via-transparent to-cyan-950/10 pointer-events-none" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-sm font-orbitron tracking-wider">{quiz.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
              <span className="text-gray-500 text-[10px]">{quiz.num_questions} questions</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-gray-400 text-[10px] block">{profile?.avatar_emoji || '✦'} {profile?.display_name || profile?.email}</span>
            {saving && <span className="text-amber-400 text-[10px] animate-pulse">Saving...</span>}
            {!saving && lastSaved && (
              <span className="text-gray-500 text-[10px]">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Answer grid */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <p className="text-gray-400 text-xs mb-4 text-center">
          Type your answers below. They autosave as you type.
        </p>

        <div className="grid grid-cols-1 gap-3">
          {answers.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-gray-500 text-sm font-orbitron w-8 text-right shrink-0">
                {i + 1}.
              </span>
              <input
                type="text"
                value={item.answer}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                placeholder={`Answer ${i + 1}`}
                className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {item.answer.trim() && (
                <span className="text-emerald-400 text-xs shrink-0">✓</span>
              )}
            </div>
          ))}
        </div>

        {/* Fill progress */}
        <div className="mt-6 text-center">
          <span className="text-gray-500 text-xs">
            {answers.filter(a => a.answer.trim()).length} / {answers.length} answered
          </span>
        </div>
      </div>
    </div>
  )
}
