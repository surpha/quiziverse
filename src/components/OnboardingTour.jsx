import { useState, useEffect, useCallback } from 'react'

const STEPS = [
  {
    title: 'Welcome to Quiziverse! 🌌',
    description: "A universe of knowledge where every question is a star. Let's take a quick tour!",
    selector: null,
    position: 'center',
  },
  {
    title: 'The Knowledge Galaxy',
    description: 'Each glowing star is a question — its color shows the knowledge domain. Click any star to explore it!',
    selector: 'canvas',
    position: 'center',
  },
  {
    title: 'Domain Legend',
    description: 'Shows which colors map to which domains — Science, History, Arts, Tech, and more.',
    selector: '[data-tour="legend"]',
    position: 'right',
  },
  {
    title: 'Play Mode',
    description: 'Start a quiz session! Filter by domain, difficulty, and question type. The globe spins and zooms into a random question.',
    selector: '[data-tour="play"]',
    position: 'top',
  },
  {
    title: 'Contribute',
    description: 'Add your own questions to the universe! Fill in the details and your question becomes a new star.',
    selector: '[data-tour="contribute"]',
    position: 'top',
  },
  {
    title: 'Answer Questions',
    description: "Type your answer and it'll be evaluated. You'll get a verdict with feedback. Use hints if you're stuck!",
    selector: null,
    position: 'center',
  },
  {
    title: 'You\'re all set! 🚀',
    description: 'Explore the galaxy, play quizzes, and contribute your knowledge. Every question you add becomes a new star!',
    selector: null,
    position: 'center',
  },
]

function getElementRect(selector) {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  return el.getBoundingClientRect()
}

function buildClipPath(rect) {
  if (!rect) return 'none'
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = 10
  const x = rect.left - pad
  const y = rect.top - pad
  const w = rect.width + pad * 2
  const h = rect.height + pad * 2
  const r = 14
  return `path('M0,0 H${vw} V${vh} H0 Z M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z')`
}

function computeTooltipPos() {
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
}

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0)
  const [clipPath, setClipPath] = useState('none')
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [glowStyle, setGlowStyle] = useState(null)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  const update = useCallback(() => {
    const rect = getElementRect(current.selector)
    setClipPath(rect ? buildClipPath(rect) : 'none')
    setTooltipStyle(computeTooltipPos())

    if (rect) {
      const pad = 10
      setGlowStyle({
        top: `${rect.top - pad}px`,
        left: `${rect.left - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`,
      })
    } else {
      setGlowStyle(null)
    }
  }, [current])

  // Elevate the target element above the overlay so it appears lit up
  // Skip canvas since it's full-screen and would block tooltip clicks
  useEffect(() => {
    if (!current.selector || current.selector === 'canvas') return
    const el = document.querySelector(current.selector)
    if (!el) return

    const prevZIndex = el.style.zIndex
    const prevFilter = el.style.filter
    el.style.zIndex = '52'
    el.style.filter = 'brightness(1.2)'

    return () => {
      el.style.zIndex = prevZIndex
      el.style.filter = prevFilter
    }
  }, [current])

  useEffect(() => {
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [update])

  return (
    <div className="absolute inset-0 z-50">
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0 bg-black/75 transition-[clip-path] duration-500 ease-in-out"
        style={{ clipPath }}
        onClick={onClose}
      />
      {/* Full dark overlay for center steps */}
      {!current.selector && (
        <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      )}

      {/* Glow around the highlighted element */}
      {glowStyle && (
        <div
          className="absolute rounded-2xl pointer-events-none transition-all duration-500 ease-in-out"
          style={{
            ...glowStyle,
            boxShadow: '0 0 20px 6px rgba(34,211,238,0.6), 0 0 60px 15px rgba(34,211,238,0.2)',
            border: '1.5px solid rgba(34,211,238,0.4)',
            animation: 'tour-pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute glass glow-border rounded-xl p-5 max-w-xs w-[85vw] md:w-80 z-[51] transition-all duration-500 ease-in-out"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step dots */}
        <div className="flex justify-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === step ? 'bg-cyan-400 scale-125' : i < step ? 'bg-cyan-600' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <h3 className="text-white text-sm font-orbitron tracking-wider mb-2 text-center">
          {current.title}
        </h3>
        <p className="text-gray-300 text-xs leading-relaxed mb-4 text-center">
          {current.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {!isFirst ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-300 text-xs cursor-pointer transition-colors"
            >
              Skip
            </button>
          )}

          {isLast ? (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-medium rounded-full transition-colors cursor-pointer"
            >
              Let's Go!
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 glass glow-border text-cyan-300 text-xs font-medium rounded-full transition-all cursor-pointer hover:bg-cyan-900/20"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
