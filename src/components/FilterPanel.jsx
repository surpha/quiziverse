import { useState } from 'react'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'

function FilterPanel({ filters, onFiltersChange }) {
  const [expanded, setExpanded] = useState(false)

  const handleToggleDomain = (domain) => {
    const updated = { ...filters }
    if (updated[domain]) {
      delete updated[domain]
    } else {
      updated[domain] = 7 // default minimum weight threshold
    }
    onFiltersChange(updated)
  }

  const handleThresholdChange = (domain, value) => {
    onFiltersChange({ ...filters, [domain]: Number(value) })
  }

  const activeCount = Object.keys(filters).length

  return (
    <div className="absolute top-4 right-4 z-20 bg-gray-900/90 border border-gray-700/50 rounded-xl backdrop-blur-sm">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-3 text-white text-sm font-medium w-full cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm4 7a1 1 0 011-1h8a1 1 0 010 2H8a1 1 0 01-1-1zm2 7a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z" />
        </svg>
        Filter
        {activeCount > 0 && (
          <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-0.5">
            {activeCount}
          </span>
        )}
      </button>

      {/* Expanded filter options */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 max-h-[60vh] overflow-y-auto border-t border-gray-700/50 pt-3">
          <p className="text-gray-400 text-xs mb-2">
            Select domains to highlight. Adjust minimum weight (1–10).
          </p>
          {DOMAIN_KEYS.map((domain) => {
            const { label, color } = DOMAINS[domain]
            const isActive = domain in filters
            return (
              <div key={domain} className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleDomain(domain)}
                  className={`flex items-center gap-2 flex-1 px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-gray-700/80 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color, opacity: isActive ? 1 : 0.4 }}
                  />
                  <span className="truncate">{label}</span>
                </button>
                {isActive && (
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={filters[domain]}
                    onChange={(e) => handleThresholdChange(domain, e.target.value)}
                    className="w-16 h-1 accent-purple-500"
                    title={`Min weight: ${filters[domain]}`}
                  />
                )}
                {isActive && (
                  <span className="text-gray-400 text-xs w-4 text-center">{filters[domain]}</span>
                )}
              </div>
            )
          })}
          {activeCount > 0 && (
            <button
              onClick={() => onFiltersChange({})}
              className="w-full mt-2 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterPanel
