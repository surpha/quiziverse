import { useEffect, useState } from 'react'

const TAGLINES = [
  'Mapping the universe of knowledge…',
  'Connecting the stars of curiosity…',
  'Charting constellations of wisdom…',
  'Aligning the cosmos of questions…',
]

function LoadingScreen() {
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)])
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2.5 + 1 + 'px',
              height: Math.random() * 2.5 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.1,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      {/* Logo + brand */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Globe icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-cyan-500/40 flex items-center justify-center animate-spin-slow">
            <div className="w-20 h-20 rounded-full border border-cyan-400/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-600/20 to-white/10 flex items-center justify-center">
                <span className="text-3xl">✦</span>
              </div>
            </div>
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 animate-orbit">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-orbitron tracking-wider">
            <span className="bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-clip-text text-transparent">
              QUIZIVERSE
            </span>
          </h1>
          <p className="text-gray-500 text-xs tracking-[0.3em] uppercase mt-1.5">
            The Knowledge Galaxy
          </p>
        </div>

        {/* Tagline */}
        <p className="text-cyan-300/70 text-sm">
          {tagline}{dots}
        </p>

        {/* Loading bar */}
        <div className="w-48 h-0.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 via-white to-cyan-500 rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
