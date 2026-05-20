import React, { useState, useEffect } from 'react'
import DOMAINS from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { verifyAnswer, isLLMConfigured } from '../utils/llmJudge'

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
  // Fallback: render as audio/video element for direct links
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
  // Generic link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs underline block mb-4">
      🎬 Open media link
    </a>
  )
}

function CosmicBlast() {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const colors = ['#00e5ff', '#7c4dff', '#00e676', '#ffea00', '#ff4081', '#ffffff', '#40c4ff', '#b388ff']
    const newParticles = Array.from({ length: 50 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.5
      const speed = 100 + Math.random() * 250
      const size = 3 + Math.random() * 6
      return {
        id: i,
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.2,
        duration: 1.2 + Math.random() * 0.8,
      }
    })
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Central flash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-20 h-20 rounded-full bg-cyan-400/50 animate-cosmic-flash" />
      </div>
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute top-1/2 left-1/2 rounded-full animate-cosmic-particle"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function QuestionCard({ question, onClose, onNext, isPlayMode }) {
  const [revealed, setRevealed] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [verdict, setVerdict] = useState(null) // { verdict, explanation }
  const [judging, setJudging] = useState(false)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [showBlast, setShowBlast] = useState(false)
  const canSubmitAnswer = !judging && !!userAnswer.trim()

  const handleNext = () => {
    setRevealed(false)
    setUserAnswer('')
    setVerdict(null)
    setHintsRevealed(0)
    setShowBlast(false)
    onNext()
  }

  const handleSubmitAnswer = async () => {
    if (!canSubmitAnswer) return
    setJudging(true)
    try {
      const result = await verifyAnswer(question.question, question.answer, userAnswer.trim())
      setVerdict(result)
      setRevealed(true)
      if (result.verdict === 'correct') setShowBlast(true)
    } catch (err) {
      console.error('Answer verification failed:', err)
      // Fallback: just reveal the answer
      setVerdict({ verdict: 'error', explanation: 'Could not verify — check the answer yourself.' })
      setRevealed(true)
    } finally {
      setJudging(false)
    }
  }

  const handleAnswerInputKeyDown = (e) => {
    if (e.key === 'Enter' && canSubmitAnswer) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  // Keyboard shortcuts: Enter for next, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && revealed && isPlayMode) {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [revealed, isPlayMode])

  const typeInfo = QUESTION_TYPES[question.type] || QUESTION_TYPES.straight
  const difficultyDots = question.difficulty || 3

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="pointer-events-auto relative glass glow-border rounded-2xl p-8 max-w-lg w-[90%] max-h-[85vh] overflow-y-auto shadow-2xl shadow-cyan-500/10">
        {/* Cosmic blast on correct answer */}
        {showBlast && <CosmicBlast />}

        {/* Fallback notice */}
        {question._fallback && (
          <div className="mb-3 px-3 py-1.5 bg-amber-900/20 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
            No more filtered questions — here's one from the full pool
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-cyan-300 text-2xl leading-none cursor-pointer transition-colors"
        >
          &times;
        </button>

        {/* Type badge + Difficulty */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2 py-1 rounded-md glass text-cyan-300 font-orbitron tracking-wider">
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-0.5" title={`Difficulty: ${difficultyDots}/10`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < difficultyDots ? 'text-cyan-400' : 'text-gray-700/50'}>●</span>
            ))}
          </span>
        </div>

        {/* Question */}
        <p className="text-white text-lg font-medium mb-4 leading-relaxed pr-6">
          {question.question}
        </p>

        {/* Image (if present) */}
        {question.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-cyan-500/20">
            <img
              src={question.imageUrl}
              alt="Question visual"
              className="w-full max-h-64 object-contain bg-black/30"
            />
          </div>
        )}

        {/* Media embed (YouTube, audio, video) */}
        <MediaEmbed url={question.mediaUrl} />

        {/* Hints section */}
        {!revealed && question.hints && question.hints.length > 0 && (
          <div className="mb-4 space-y-2">
            {question.hints.slice(0, hintsRevealed).map((hint, i) => (
              <div key={i} className="px-3 py-2 glass rounded-lg border border-amber-500/20 text-amber-200/80 text-sm">
                <span className="text-amber-500/60 text-xs font-orbitron mr-2">Hint {i + 1}</span>
                {hint}
              </div>
            ))}
            {hintsRevealed < question.hints.length && (
              <button
                type="button"
                onClick={() => setHintsRevealed(h => h + 1)}
                className="text-amber-400/70 hover:text-amber-300 text-xs cursor-pointer transition-colors"
              >
                💡 Get hint ({hintsRevealed + 1}/{question.hints.length})
              </button>
            )}
          </div>
        )}

        {/* Answer area */}
        {revealed ? (
          <div className="space-y-3 mb-4">
            {/* Verdict badge */}
            {verdict && verdict.verdict !== 'error' && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${
                verdict.verdict === 'correct'
                  ? 'bg-emerald-500/10 border-emerald-400/30'
                  : verdict.verdict === 'partially_correct'
                    ? 'bg-yellow-500/10 border-yellow-400/30'
                    : 'bg-red-500/10 border-red-400/30'
              }`}>
                <span className="text-lg">
                  {verdict.verdict === 'correct' ? '✓' : verdict.verdict === 'partially_correct' ? '◐' : '✗'}
                </span>
                <span className={`text-sm font-medium font-orbitron tracking-wide ${
                  verdict.verdict === 'correct'
                    ? 'text-emerald-400'
                    : verdict.verdict === 'partially_correct'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}>
                  {verdict.verdict === 'correct' ? 'Correct!' : verdict.verdict === 'partially_correct' ? 'Partially Correct' : 'Incorrect'}
                </span>
              </div>
            )}

            {/* Explanation */}
            {verdict?.explanation && (
              <p className="text-gray-400 text-sm px-1">{verdict.explanation}</p>
            )}

            {/* Correct answer */}
            <div className="glass rounded-lg p-4 border-cyan-500/20">
              <p className="text-cyan-400/60 text-xs mb-1 font-orbitron tracking-wider">Correct Answer</p>
              <p className="text-cyan-100 text-base leading-relaxed">
                {question.answer}
              </p>
              {/* Answer image/media */}
              {question.answerImageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border border-cyan-500/20">
                  <img src={question.answerImageUrl} alt="Answer visual" className="w-full max-h-64 object-contain bg-black/30" />
                </div>
              )}
              {question.answerMediaUrl && <MediaEmbed url={question.answerMediaUrl} />}
            </div>
          </div>
        ) : isPlayMode && isLLMConfigured() ? (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleAnswerInputKeyDown}
                placeholder="Type your answer..."
                disabled={judging}
                className="flex-1 glass rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 placeholder-gray-500"
                autoFocus
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!canSubmitAnswer}
                className="px-4 py-3 glass glow-border text-cyan-300 font-orbitron text-xs tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50 hover:bg-cyan-900/20"
              >
                {judging ? '...' : 'Submit'}
              </button>
            </div>
            <button
              onClick={() => setRevealed(true)}
              className="mt-2 text-cyan-600 hover:text-cyan-400 text-xs cursor-pointer"
            >
              Skip — just show the answer
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 px-6 glass glow-border text-cyan-300 font-orbitron tracking-wider rounded-lg transition-all cursor-pointer hover:bg-cyan-900/20"
          >
            Reveal Answer
          </button>
        )}

        {/* Domain tags — show domains with weight >= 6 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(question.weights)
            .filter(([, v]) => v >= 6)
            .sort(([, a], [, b]) => b - a)
            .map(([domain, weight]) => (
              <span
                key={domain}
                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: `${DOMAINS[domain]?.color}20`,
                  color: DOMAINS[domain]?.color || '#a78bfa',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: DOMAINS[domain]?.color }}
                />
                {DOMAINS[domain]?.label || domain} ({weight})
              </span>
            ))}
        </div>

        {/* Credits / Source attribution */}
        {question.source && (
          <div className="mt-4 px-3 py-2 glass rounded-lg">
            <span className="text-cyan-600 text-xs">Credit: </span>
            {question.source.match(/^https?:\/\//) ? (
              <a
                href={question.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 text-xs hover:text-cyan-300 underline"
              >
                {question.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </a>
            ) : (
              <span className="text-gray-300 text-xs">{question.source}</span>
            )}
          </div>
        )}

        {/* Play mode navigation */}
        {isPlayMode && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 glass text-gray-300 hover:text-cyan-300 hover:border-cyan-500/40 font-medium rounded-lg transition-all cursor-pointer text-sm"
            >
              Stop
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 px-4 glass glow-border text-cyan-300 font-orbitron tracking-wider rounded-lg transition-all cursor-pointer text-sm hover:bg-cyan-900/20"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionCard
