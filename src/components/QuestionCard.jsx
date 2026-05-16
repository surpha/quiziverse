import { useState } from 'react'
import DOMAINS from '../utils/domainConfig'

function QuestionCard({ question, onClose, onNext, isPlayMode }) {
  const [revealed, setRevealed] = useState(false)

  const handleNext = () => {
    setRevealed(false)
    onNext()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-8 max-w-lg w-[90%] shadow-2xl shadow-purple-500/20 backdrop-blur-sm">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        {/* Question */}
        <p className="text-white text-lg font-medium mb-6 leading-relaxed pr-6">
          {question.question}
        </p>

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

        {/* Source attribution */}
        {question.source && (
          <p className="mt-4 text-xs text-gray-500 italic">
            Source: {question.source}
          </p>
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
