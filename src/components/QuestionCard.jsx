import { useState } from 'react'
import DOMAINS from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'

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
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs underline block mb-4">
      🎬 Open media link
    </a>
  )
}

function QuestionCard({ question, onClose, onNext, isPlayMode }) {
  const [revealed, setRevealed] = useState(false)

  const handleNext = () => {
    setRevealed(false)
    onNext()
  }

  const typeInfo = QUESTION_TYPES[question.type] || QUESTION_TYPES.straight
  const difficultyDots = question.difficulty || 3

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-8 max-w-lg w-[90%] max-h-[85vh] overflow-y-auto shadow-2xl shadow-purple-500/20 backdrop-blur-sm">
        {/* Fallback notice */}
        {question._fallback && (
          <div className="mb-3 px-3 py-1.5 bg-amber-900/30 border border-amber-600/30 rounded-lg text-amber-300 text-xs">
            No more filtered questions — here's one from the full pool
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        {/* Type badge + Difficulty */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-300 border border-gray-700">
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-0.5" title={`Difficulty: ${difficultyDots}/10`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < difficultyDots ? 'text-yellow-400' : 'text-gray-700'}>●</span>
            ))}
          </span>
        </div>

        {/* Question */}
        <p className="text-white text-lg font-medium mb-4 leading-relaxed pr-6">
          {question.question}
        </p>

        {/* Image (if present) */}
        {question.imageUrl && (
          <div className="mb-4 rounded-lg overflow-hidden border border-gray-700/50">
            <img
              src={question.imageUrl}
              alt="Question visual"
              className="w-full max-h-64 object-contain bg-black/30"
            />
          </div>
        )}

        {/* Media embed (YouTube, audio, video) */}
        <MediaEmbed url={question.mediaUrl} />

        {/* Answer area */}
        {revealed ? (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
            <p className="text-purple-200 text-base leading-relaxed">
              {question.answer}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
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
          <div className="mt-4 px-3 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg">
            <span className="text-gray-500 text-xs">Credit: </span>
            {question.source.match(/^https?:\/\//) ? (
              <a
                href={question.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 text-xs hover:text-purple-300 underline"
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
              className="flex-1 py-2.5 px-4 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-medium rounded-lg transition-colors cursor-pointer text-sm"
            >
              Stop
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors cursor-pointer text-sm"
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
