import { useState } from 'react'
import QUESTION_TYPES from '../utils/questionTypes'

function TypeFilter({ selectedTypes = [], onToggleType }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="absolute bottom-10 left-4 z-20">
      {/* Desktop: always visible */}
      <div className="hidden md:block glass glow-border rounded-xl p-4">
        <h3 className="text-white text-sm font-orbitron tracking-wider mb-3 uppercase">Types</h3>
        <div className="space-y-2">
          {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => {
            const active = selectedTypes.length === 0 || selectedTypes.includes(key)
            return (
              <div
                key={key}
                className={`flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
                onClick={() => onToggleType?.(key)}
              >
                <span className="text-sm shrink-0">{icon}</span>
                <span className="text-gray-300 text-xs">{label}</span>
              </div>
            )
          })}
        </div>
        {selectedTypes.length > 0 && (
          <button
            onClick={() => onToggleType?.('__clear__')}
            className="mt-3 text-gray-500 hover:text-cyan-400 text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile: collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="glass glow-border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer"
        >
          <span className="text-white text-xs font-orbitron tracking-wider">Types</span>
          {selectedTypes.length > 0 && (
            <span className="text-cyan-400 text-[10px]">({selectedTypes.length})</span>
          )}
          <span className="text-gray-400 text-xs">{expanded ? '▼' : '▲'}</span>
        </button>
        {expanded && (
          <div className="mb-2 glass glow-border rounded-xl p-3 max-h-[50vh] overflow-y-auto absolute bottom-full left-0">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => {
                const active = selectedTypes.length === 0 || selectedTypes.includes(key)
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
                    onClick={() => onToggleType?.(key)}
                  >
                    <span className="text-xs shrink-0">{icon}</span>
                    <span className="text-gray-300 text-[10px] leading-tight">{label}</span>
                  </div>
                )
              })}
            </div>
            {selectedTypes.length > 0 && (
              <button
                onClick={() => onToggleType?.('__clear__')}
                className="mt-2 text-gray-500 hover:text-cyan-400 text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TypeFilter
