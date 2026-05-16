import { useState } from 'react'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES, { QUESTION_TYPE_KEYS } from '../utils/questionTypes'

/**
 * Play Filters — shown before starting play mode.
 * Lets users choose domains, difficulty range, and question types.
 */
function PlayFilters({ onStart, onClose, profile }) {
  // Seed favorite domains from profile if available
  const [selectedDomains, setSelectedDomains] = useState(
    () => profile?.favorite_domains?.length ? [...profile.favorite_domains] : []
  )
  const [difficultyRange, setDifficultyRange] = useState([1, 10])
  const [selectedTypes, setSelectedTypes] = useState([])

  const toggleDomain = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    )
  }

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleStart = () => {
    onStart({
      domains: selectedDomains,
      difficultyMin: difficultyRange[0],
      difficultyMax: difficultyRange[1],
      types: selectedTypes,
    })
  }

  const hasFilters = selectedDomains.length > 0 || selectedTypes.length > 0 ||
    difficultyRange[0] !== 1 || difficultyRange[1] !== 10

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-lg w-[92%] shadow-2xl shadow-purple-500/20 backdrop-blur-sm max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-semibold mb-1">Play Settings</h2>
        <p className="text-gray-400 text-sm mb-5">
          Customize your quiz, or start without filters for a random mix.
        </p>

        {/* Domains */}
        <div className="mb-5">
          <label className="text-gray-300 text-sm font-medium block mb-2">
            Domains {selectedDomains.length > 0 && <span className="text-purple-400">({selectedDomains.length})</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DOMAIN_KEYS.map(domain => {
              const { label, color } = DOMAINS[domain]
              const active = selectedDomains.includes(domain)
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    active
                      ? 'text-white ring-1 ring-current'
                      : 'text-gray-400 hover:text-gray-200 bg-gray-800/50'
                  }`}
                  style={active ? { backgroundColor: color + '25', color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, opacity: active ? 1 : 0.4 }}
                  />
                  {label.split(' & ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Difficulty Range */}
        <div className="mb-5">
          <label className="text-gray-300 text-sm font-medium block mb-2">
            Difficulty Range: <span className="text-purple-400">{difficultyRange[0]} – {difficultyRange[1]}</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs w-6">Min</span>
            <input
              type="range"
              min="1"
              max="10"
              value={difficultyRange[0]}
              onChange={(e) => {
                const val = Number(e.target.value)
                setDifficultyRange([val, Math.max(val, difficultyRange[1])])
              }}
              className="flex-1 h-1.5 accent-purple-500"
            />
            <span className="text-gray-400 text-xs w-4 text-center">{difficultyRange[0]}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-gray-500 text-xs w-6">Max</span>
            <input
              type="range"
              min="1"
              max="10"
              value={difficultyRange[1]}
              onChange={(e) => {
                const val = Number(e.target.value)
                setDifficultyRange([Math.min(difficultyRange[0], val), val])
              }}
              className="flex-1 h-1.5 accent-purple-500"
            />
            <span className="text-gray-400 text-xs w-4 text-center">{difficultyRange[1]}</span>
          </div>
        </div>

        {/* Question Types */}
        <div className="mb-6">
          <label className="text-gray-300 text-sm font-medium block mb-2">
            Question Types {selectedTypes.length > 0 && <span className="text-purple-400">({selectedTypes.length})</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUESTION_TYPE_KEYS.map(type => {
              const { label, icon } = QUESTION_TYPES[type]
              const active = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    active
                      ? 'bg-purple-600/30 text-purple-300 ring-1 ring-purple-500/50'
                      : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {hasFilters ? 'Play with Filters' : 'Play All'}
          </button>
          {hasFilters && (
            <button
              onClick={() => { setSelectedDomains([]); setSelectedTypes([]); setDifficultyRange([1, 10]) }}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayFilters
