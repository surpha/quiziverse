import { useState, useEffect } from 'react'
import { verifyAnswer, isLLMConfigured } from '../utils/llmJudge'
import { useDailyChallenge } from '../hooks/useDailyChallenge'
import { useDailyChallengeByDate } from '../hooks/useDailyChallengeByDate'
import { useDisputes } from '../hooks/useDisputes'
import { getStreakFact, getStreakEmoji, getStreakLabel } from '../utils/streakFacts'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function MediaEmbed({ url }) {
  if (!url) return null
  const ytId = getYouTubeId(url)
  if (ytId) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden border border-gray-700/50 aspect-video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytId}`}
          title="Video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if (url.match(/\.(mp3|wav|ogg|m4a)(\?|$)/i)) {
    return (
      <div className="mb-4">
        <audio controls src={url} className="w-full" />
      </div>
    )
  }
  if (url.match(/\.(mp4|webm|ogv)(\?|$)/i)) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden border border-gray-700/50">
        <video controls src={url} className="w-full max-h-48" />
      </div>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs underline block mb-4">
      🎬 Open media link
    </a>
  )
}

function ScoreBar({ score, maxPossible }) {
  const pct = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-cyan-300 text-xs font-orbitron">{score}/{maxPossible}</span>
    </div>
  )
}

export default function DailyChallenge({ userId, onClose, date, streak, onStreakChange }) {
  // Use date-specific hook for archive mode, regular hook for today
  const todayHook = useDailyChallenge(date ? null : userId)
  const archiveHook = useDailyChallengeByDate(userId, date || null)
  const { challenge, attempt, loading, error, startAttempt, saveAnswer } = date ? archiveHook : todayHook
  const [currentQ, setCurrentQ] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [revealedHints, setRevealedHints] = useState([])
  const [showBlast, setShowBlast] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [disputeRaised, setDisputeRaised] = useState({})
  const { raiseDispute } = useDisputes(userId)

  // Sync current question index from attempt ONLY on initial load
  useEffect(() => {
    if (attempt && !initialized) {
      setCurrentQ(attempt.completed ? attempt.answers.length - 1 : attempt.current_index)
      setInitialized(true)
    }
  }, [attempt, initialized])

  // Start attempt on first open if none exists
  useEffect(() => {
    if (challenge && !attempt && !loading) {
      startAttempt()
    }
  }, [challenge, attempt, loading, startAttempt])

  // Keyboard shortcuts: Enter for next/finish after verdict, Escape to close
  const questionsCount = challenge?.questions?.length || 0
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const hasVerdict = verdict || attempt?.answers?.find(a => a.question_index === currentQ)
        if (hasVerdict && questionsCount > 0) {
          e.preventDefault()
          if (currentQ < questionsCount - 1) {
            setUserAnswer('')
            setVerdict(null)
            setRevealedHints([])
            setShowBlast(false)
            setCurrentQ(prev => prev + 1)
          } else {
            setShowCompleted(true)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [verdict, currentQ, questionsCount, attempt])

  // Refetch streak when challenge is completed (small delay for DB propagation)
  const isCompleted = showCompleted || (attempt?.completed && !verdict)
  useEffect(() => {
    if (isCompleted && onStreakChange) {
      const t = setTimeout(() => onStreakChange(), 500)
      return () => clearTimeout(t)
    }
  }, [isCompleted, onStreakChange])

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <p className="text-cyan-400 text-sm animate-pulse font-orbitron">Loading daily challenge...</p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-8 max-w-md w-[90%] text-center" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-4">🌙</div>
          <h2 className="text-white text-xl font-orbitron tracking-wider mb-3">No Challenge Today</h2>
          <p className="text-gray-400 text-sm mb-6">Check back tomorrow at midnight IST for a new daily challenge!</p>
          <button onClick={onClose} className="px-6 py-2.5 glass glow-border text-cyan-300 text-sm rounded-full cursor-pointer hover:bg-cyan-900/20">
            Close
          </button>
        </div>
      </div>
    )
  }

  const questions = challenge.questions
  const maxPossible = questions.reduce((sum, q) => sum + (q.max_score || 10), 0)
  const question = questions[currentQ]

  // Calculate score lost by hints for current question
  const hintCostTotal = revealedHints.reduce((sum, idx) => sum + (question?.hints?.[idx]?.cost || 1), 0)
  const questionMaxScore = question?.max_score || 10

  const handleRevealHint = (hintIdx) => {
    if (!revealedHints.includes(hintIdx)) {
      setRevealedHints(prev => [...prev, hintIdx])
    }
  }

  const handleSubmit = async () => {
    if (!userAnswer.trim() || verifying) return
    setVerifying(true)
    try {
      const result = await verifyAnswer(question.question, question.answer, userAnswer.trim())
      setVerdict(result)

      // Calculate score
      let score = 0
      if (result.verdict === 'correct') {
        score = Math.max(0, questionMaxScore - hintCostTotal)
        setShowBlast(true)
      } else if (result.verdict === 'partial') {
        score = Math.max(0, Math.floor((questionMaxScore - hintCostTotal) * 0.5))
      }

      // Save to DB
      await saveAnswer(currentQ, userAnswer.trim(), result.verdict, revealedHints, score)
    } catch {
      // On verification failure, mark as incorrect with 0 score
      const fallbackVerdict = { verdict: 'incorrect', explanation: 'Verification failed. Marked as incorrect.' }
      setVerdict(fallbackVerdict)
      await saveAnswer(currentQ, userAnswer.trim(), 'incorrect', revealedHints, 0)
    } finally {
      setVerifying(false)
    }
  }

  const handleNext = () => {
    setUserAnswer('')
    setVerdict(null)
    setRevealedHints([])
    setShowBlast(false)
    setCurrentQ(prev => prev + 1)
  }


  // Generate shareable text
  const generateShareText = () => {
    const date = challenge.challenge_date
    const answers = attempt.answers
    const total = attempt.total_score
    const max = maxPossible

    // Moon phases from full (perfect) to new (zero)
    const moonPhases = ['🌕', '🌖', '🌗', '🌘', '🌑']

    const getMoonPhase = (score, maxScore) => {
      if (maxScore === 0) return moonPhases[4]
      const ratio = score / maxScore
      if (ratio >= 1) return moonPhases[0]      // 🌕 perfect
      if (ratio >= 0.75) return moonPhases[1]   // 🌖
      if (ratio >= 0.5) return moonPhases[2]    // 🌗
      if (ratio > 0) return moonPhases[3]       // 🌘
      return moonPhases[4]                       // 🌑 zero
    }

    // Per-question rows with moon phase, hints used, and score
    const rows = answers.map((a, i) => {
      const q = questions[a.question_index]
      const qMax = q?.max_score || 10
      const totalHints = (q?.hints || []).length
      const hintsUsed = (a.hints_used || []).length

      // Moon phase based on score ratio
      const moon = getMoonPhase(a.score, qMax)

      // Hint circles: ● = used, ○ = available but unused
      const hintStr = totalHints > 0
        ? ' ' + '●'.repeat(hintsUsed) + '○'.repeat(totalHints - hintsUsed)
        : ''

      // Score
      const scoreStr = `${a.score}/${qMax}`

      return `${moon}${hintStr}  ${scoreStr}`
    })

    // Star rating: 5 stars using ⭐ emoji
    const overallPct = max > 0 ? total / max : 0
    const filledStars = Math.round(overallPct * 5)
    const stars = '⭐'.repeat(filledStars) + '☆'.repeat(5 - filledStars)

    const text = [
      `🌌 Quiziverse Daily • ${date}`,
      '',
      ...rows,
      '',
      `Total: ${total}/${max} ${stars}`,
      ...(streak > 0 ? [`${getStreakEmoji(streak)} ${streak}-day streak`] : []),
      '',
      'Play daily → https://quiziverse-tau.vercel.app/daily-challenge'
    ].join('\n')

    return text
  }

  const handleShare = async () => {
    const text = generateShareText()

    // Use native share sheet on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard! Share it anywhere 🚀')
    } catch {
      prompt('Copy your result:', text)
    }
  }

  // Completed view
  if (isCompleted && !reviewMode) {
    const totalScore = attempt?.total_score || 0
    const answersData = attempt?.answers || []
    const streakFact = streak > 0 ? getStreakFact(streak) : null

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-8 max-w-md w-[90%] text-center" onClick={e => e.stopPropagation()}>
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-white text-xl font-orbitron tracking-wider mb-2">Challenge Complete!</h2>
          <p className="text-gray-400 text-xs mb-4">Daily Quiziverse Challenge • {challenge.challenge_date}</p>
          <div className="mb-6">
            <ScoreBar score={totalScore} maxPossible={maxPossible} />
          </div>

          {/* Streak display */}
          <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30">
            {streak > 0 ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">{getStreakEmoji(streak)}</span>
                  <span className="text-amber-300 font-orbitron text-lg">{streak}</span>
                  <span className="text-amber-200/80 text-xs font-orbitron">{streak === 1 ? 'day' : 'day streak'}</span>
                  {getStreakLabel(streak) && (
                    <span className="text-amber-500/60 text-[10px] uppercase tracking-wider">• {getStreakLabel(streak)}</span>
                  )}
                </div>
                {streakFact && (
                  <p className="text-gray-400 text-[11px] italic leading-relaxed">{streakFact}</p>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-gray-400 text-xs">Come back tomorrow to start a streak!</span>
              </div>
            )}
          </div>

          <div className="space-y-2 mb-6">
            {answersData.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Q{i + 1}</span>
                <span className={`font-medium ${
                  a.verdict === 'correct' ? 'text-emerald-400' :
                  a.verdict === 'partial' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {a.verdict === 'correct' ? '✓' : a.verdict === 'partial' ? '~' : '✗'} {a.score} pts
                </span>
              </div>
            ))}
          </div>

          {/* Shareable preview */}
          <div className="bg-gray-900/80 rounded-lg p-3 mb-4 text-left">
            <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateShareText()}</pre>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => { setReviewMode(true); setReviewIndex(0) }}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-full cursor-pointer transition-colors flex items-center gap-2"
            >
              🔍 Review Answers
            </button>
            <button
              onClick={handleShare}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-full cursor-pointer transition-colors flex items-center gap-2"
            >
              📋 Share Result
            </button>
            <button onClick={onClose} className="px-5 py-2.5 glass glow-border text-cyan-300 text-sm rounded-full cursor-pointer hover:bg-cyan-900/20">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Review mode: browse through past answers
  if (reviewMode) {
    const reviewQ = questions[reviewIndex]
    const reviewAnswer = attempt?.answers?.find(a => a.question_index === reviewIndex)
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-6 max-w-lg w-[92%] max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <h3 className="text-white text-sm font-orbitron tracking-wider">Review • {challenge.challenge_date}</h3>
            </div>
            <button onClick={() => setReviewMode(false)} className="text-gray-400 hover:text-white text-sm cursor-pointer">← Back</button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-4">
            {questions.map((_, i) => {
              const a = attempt?.answers?.find(ans => ans.question_index === i)
              return (
                <button
                  key={i}
                  onClick={() => setReviewIndex(i)}
                  className={`flex-1 h-1.5 rounded-full transition-all cursor-pointer ${
                    i === reviewIndex ? 'bg-purple-400' :
                    a?.verdict === 'correct' ? 'bg-emerald-500' :
                    a?.verdict === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
              )
            })}
          </div>

          {/* Question */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-xs">Q{reviewIndex + 1} of {questions.length}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                Difficulty: {reviewQ.difficulty}/10
              </span>
            </div>
            <p className="text-white text-base leading-relaxed">{reviewQ.question}</p>
          </div>

          {/* Image */}
          {reviewQ.imageUrl && (
            <div className="mb-4 h-48 rounded-lg border border-cyan-500/20 bg-black/30 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-2">
              {reviewQ.imageUrl.split(',').map((url, i) => (
                <img key={i} src={url.trim()} alt={`Question visual ${i + 1}`} className="h-full max-h-44 object-contain flex-shrink-0 rounded" />
              ))}
            </div>
          )}

          {/* Media */}
          <MediaEmbed url={reviewQ.mediaUrl} />

          {/* Hints that were revealed */}
          {reviewAnswer?.hints_used?.length > 0 && reviewQ.hints && (
            <div className="mb-4 space-y-1">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Hints used</p>
              {reviewAnswer.hints_used.map((idx) => (
                <div key={idx} className="text-amber-300/90 text-sm bg-amber-900/20 rounded-lg px-3 py-2">
                  💡 {reviewQ.hints[idx]?.text}
                </div>
              ))}
            </div>
          )}

          {/* Your answer */}
          <div className="mb-3">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Your answer</p>
            <p className="text-white text-sm bg-gray-800/50 rounded-lg px-4 py-2.5 border border-gray-700">
              {reviewAnswer?.answer || <span className="text-gray-500 italic">No answer recorded</span>}
            </p>
          </div>

          {/* Verdict + correct answer */}
          <div className={`rounded-lg px-4 py-3 mb-4 ${
            reviewAnswer?.verdict === 'correct'
              ? 'bg-emerald-900/30 border border-emerald-500/30' :
            reviewAnswer?.verdict === 'partial'
              ? 'bg-amber-900/30 border border-amber-500/30'
              : 'bg-red-900/30 border border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-medium ${
                reviewAnswer?.verdict === 'correct' ? 'text-emerald-400' :
                reviewAnswer?.verdict === 'partial' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {reviewAnswer?.verdict === 'correct' ? '✓ Correct' :
                 reviewAnswer?.verdict === 'partial' ? '~ Partial' : '✗ Incorrect'}
              </p>
              <span className="text-cyan-300 text-xs font-orbitron">{reviewAnswer?.score || 0} pts</span>
            </div>
            <p className="text-gray-300 text-xs mt-1">
              Correct answer: {reviewQ.answer}
            </p>
            {reviewQ.answerExplanation && (
              <p className="text-gray-400 text-xs mt-2 leading-relaxed">{reviewQ.answerExplanation}</p>
            )}
            {reviewQ.answerImageUrl && (
              <div className="mt-3 h-48 rounded-lg border border-cyan-500/20 bg-black/30 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-2">
                {reviewQ.answerImageUrl.split(',').map((url, i) => (
                  <img key={i} src={url.trim()} alt={`Answer visual ${i + 1}`} className="h-full max-h-44 object-contain flex-shrink-0 rounded" />
                ))}
              </div>
            )}
            {reviewQ.answerMediaUrl && <MediaEmbed url={reviewQ.answerMediaUrl} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setReviewIndex(i => Math.max(0, i - 1))}
              disabled={reviewIndex === 0}
              className="px-4 py-2 glass text-cyan-300 text-sm rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-gray-500 text-xs">{reviewIndex + 1} / {questions.length}</span>
            {reviewIndex < questions.length - 1 ? (
              <button
                onClick={() => setReviewIndex(i => i + 1)}
                className="px-4 py-2 glass text-cyan-300 text-sm rounded-lg cursor-pointer"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setReviewMode(false)}
                className="px-4 py-2 glass text-purple-300 text-sm rounded-lg cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Already answered this question (viewing past answer)
  const existingAnswer = attempt?.answers?.find(a => a.question_index === currentQ)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="glass glow-border rounded-2xl p-6 max-w-lg w-[92%] max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="text-white text-sm font-orbitron tracking-wider">Daily Quiziverse Challenge</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < currentQ ? 'bg-emerald-500' :
                i === currentQ ? 'bg-cyan-400' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Score so far */}
        <div className="mb-4">
          <ScoreBar score={attempt?.total_score || 0} maxPossible={maxPossible} />
        </div>

        {/* Question */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500 text-xs">Q{currentQ + 1} of {questions.length}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
              Difficulty: {question.difficulty}/10
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300">
              {questionMaxScore} pts
            </span>
          </div>
          <p className="text-white text-base leading-relaxed">{question.question}</p>
        </div>

        {/* Image(s) - supports comma-separated URLs */}
        {question.imageUrl && (
          <div className="mb-4 h-48 rounded-lg border border-cyan-500/20 bg-black/30 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-2">
            {question.imageUrl.split(',').map((url, i) => (
              <img key={i} src={url.trim()} alt={`Question visual ${i + 1}`} className="h-full max-h-44 object-contain flex-shrink-0 rounded" />
            ))}
          </div>
        )}

        {/* Media embed (YouTube, audio, video) */}
        <MediaEmbed url={question.mediaUrl} />

        {/* Hints */}
        {question.hints && question.hints.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Hints (cost shown)</p>
            {question.hints.map((hint, idx) => (
              <div key={idx}>
                {revealedHints.includes(idx) ? (
                  <div className="text-amber-300/90 text-sm bg-amber-900/20 rounded-lg px-3 py-2">
                    💡 {hint.text}
                    <span className="text-amber-500/60 text-xs ml-2">(-{hint.cost})</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRevealHint(idx)}
                    disabled={!!verdict || !!existingAnswer}
                    className="text-gray-400 hover:text-amber-300 text-xs bg-gray-800/50 rounded-lg px-3 py-2 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full text-left"
                  >
                    💡 Reveal hint {idx + 1} <span className="text-gray-600">(-{hint.cost} pts)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Answer input */}
        {!existingAnswer && (
          <div className="space-y-3">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && userAnswer.trim() && !verifying) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Type your answer..."
              disabled={!!verdict}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              autoFocus
            />

            {!verdict && (
              <button
                onClick={handleSubmit}
                disabled={!userAnswer.trim() || verifying}
                className="w-full px-4 py-2.5 bg-cyan-600/80 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Submit Answer'}
              </button>
            )}
          </div>
        )}

        {/* Verdict */}
        {(verdict || existingAnswer) && (
          <div className="mt-4">
            <div className={`rounded-lg px-4 py-3 ${
              (verdict?.verdict || existingAnswer?.verdict) === 'correct'
                ? 'bg-emerald-900/30 border border-emerald-500/30' :
              (verdict?.verdict || existingAnswer?.verdict) === 'partial'
                ? 'bg-amber-900/30 border border-amber-500/30'
                : 'bg-red-900/30 border border-red-500/30'
            }`}>
              <p className={`text-sm font-medium ${
                (verdict?.verdict || existingAnswer?.verdict) === 'correct' ? 'text-emerald-400' :
                (verdict?.verdict || existingAnswer?.verdict) === 'partial' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {(verdict?.verdict || existingAnswer?.verdict) === 'correct' ? '✓ Correct!' :
                 (verdict?.verdict || existingAnswer?.verdict) === 'partial' ? '~ Partially Correct' : '✗ Incorrect'}
              </p>
              {verdict?.explanation && (
                <p className="text-gray-300 text-xs mt-1">{verdict.explanation}</p>
              )}
              {/* Dispute button */}
              {verdict && (verdict.verdict === 'incorrect' || verdict.verdict === 'partial') && !disputeRaised[currentQ] && (
                <button
                  onClick={() => {
                    raiseDispute({
                      questionId: `daily-${challenge?.id}-${currentQ}`,
                      questionText: question.question,
                      correctAnswer: question.answer,
                      userAnswer: userAnswer || existingAnswer?.answer || '',
                      llmVerdict: verdict.verdict,
                    })
                    setDisputeRaised(prev => ({ ...prev, [currentQ]: true }))
                  }}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 rounded-lg transition-colors cursor-pointer"
                >
                  ⚠ Dispute — I think I'm correct
                </button>
              )}
              {disputeRaised[currentQ] && (
                <p className="text-amber-400/70 text-xs mt-2">✓ Dispute raised — an admin will review it</p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Answer: {question.answer}
              </p>
              {/* Answer explanation */}
              {question.answerExplanation && (
                <p className="text-gray-400 text-xs mt-2 leading-relaxed">{question.answerExplanation}</p>
              )}
              {/* Answer image(s) - supports comma-separated URLs */}
              {question.answerImageUrl && (
                <div className="mt-3 h-48 rounded-lg border border-cyan-500/20 bg-black/30 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-2">
                  {question.answerImageUrl.split(',').map((url, i) => (
                    <img key={i} src={url.trim()} alt={`Answer visual ${i + 1}`} className="h-full max-h-44 object-contain flex-shrink-0 rounded" />
                  ))}
                </div>
              )}
              {question.answerMediaUrl && <MediaEmbed url={question.answerMediaUrl} />}
            </div>

            {/* Next / Finish button — shown after any verdict */}
            {currentQ < questions.length - 1 && (
              <button
                onClick={handleNext}
                className="mt-3 w-full px-4 py-2.5 glass glow-border text-cyan-300 text-sm font-medium rounded-lg cursor-pointer hover:bg-cyan-900/20"
              >
                Next Question →
              </button>
            )}
            {currentQ === questions.length - 1 && (
              <button
                onClick={() => setShowCompleted(true)}
                className="mt-3 w-full px-4 py-2.5 glass glow-border text-cyan-300 text-sm font-medium rounded-lg cursor-pointer hover:bg-cyan-900/20"
              >
                Finish Challenge
              </button>
            )}
          </div>
        )}

        {/* Cosmic blast on correct */}
        {showBlast && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="animate-cosmic-flash w-4 h-4 rounded-full bg-cyan-400" />
          </div>
        )}
      </div>
    </div>
  )
}
