import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import DOMAINS from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { cn } from '../lib/utils'

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
      <div className="mb-4 rounded-lg overflow-hidden border border-border aspect-video">
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
      <div className="mb-4 rounded-lg overflow-hidden border border-border">
        <video controls src={url} className="w-full max-h-48" />
      </div>
    )
  }
  // Generic link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline block mb-4">
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
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-30 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 glass rounded-2xl p-8 shadow-2xl max-h-[85vh] overflow-y-auto">
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>

          {/* Fallback notice */}
          {question._fallback && (
            <div className="mb-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
              No more filtered questions — here's one from the full pool
            </div>
          )}

          {/* Type badge + Difficulty */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-1 rounded-md bg-card text-foreground border border-border">
              {typeInfo.icon} {typeInfo.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5" title={`Difficulty: ${difficultyDots}/10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={i < difficultyDots ? 'text-accent' : 'text-muted'}>●</span>
              ))}
            </span>
          </div>

          {/* Question */}
          <Dialog.Title className="text-lg font-medium mb-4 leading-relaxed">
            {question.question}
          </Dialog.Title>

          {/* Image (if present) */}
          {question.imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border">
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
            <div className={cn(
              'rounded-lg p-4 mb-4 border',
              'bg-primary/10 border-primary/30'
            )}>
              <p className="text-foreground text-base leading-relaxed">
                {question.answer}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className={cn(
                'w-full py-3 px-6 font-medium rounded-lg transition-colors mb-4',
                'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              Reveal Answer
            </button>
          )}

          {/* Domain tags — show domains with weight >= 6 */}
          <div className="flex flex-wrap gap-2 mb-4">
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
            <div className="mb-4 px-3 py-2 bg-card border border-border rounded-lg">
              <span className="text-muted-foreground text-xs">Credit: </span>
              {question.source.match(/^https?:\/\//) ? (
                <a
                  href={question.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-xs hover:text-primary/80 underline"
                >
                  {question.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </a>
              ) : (
                <span className="text-foreground text-xs">{question.source}</span>
              )}
            </div>
          )}

          {/* Play mode navigation */}
          {isPlayMode && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={cn(
                  'flex-1 py-2.5 px-4 font-medium rounded-lg transition-colors text-sm',
                  'border border-border text-foreground hover:bg-card'
                )}
              >
                Stop
              </button>
              <button
                onClick={handleNext}
                className={cn(
                  'flex-1 py-2.5 px-4 font-medium rounded-lg transition-colors text-sm',
                  'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Next →
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default QuestionCard
