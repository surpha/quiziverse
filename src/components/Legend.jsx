import { useState } from 'react'
import DOMAINS from '../utils/domainConfig'

function Legend({ selectedDomains = [], onToggleDomain }) {
  const [expanded, setExpanded] = useState(false)
  const isInteractive = !!onToggleDomain

  return (
    <div data-tour="legend" className="absolute top-4 left-4 z-20">
      {/* Desktop: always visible */}
      <div className="hidden md:block glass glow-border rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-white text-sm font-orbitron tracking-wider mb-3 uppercase">Domains</h3>
        <div className="space-y-2">
          {Object.entries(DOMAINS).map(([key, { label, color }]) => {
            const active = selectedDomains.length === 0 || selectedDomains.includes(key)
            return (
              <div
                key={key}
                className={`flex items-center gap-2 ${isInteractive ? 'cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 py-0.5' : ''} transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
                onClick={() => onToggleDomain?.(key)}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }}
                />
                <span className="text-gray-300 text-xs">{label}</span>
              </div>
            )
          })}
        </div>
        {selectedDomains.length > 0 && (
          <button
            onClick={() => onToggleDomain?.('__clear__')}
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
          <span className="text-white text-xs font-orbitron tracking-wider">Domains</span>
          {selectedDomains.length > 0 && (
            <span className="text-cyan-400 text-[10px]">({selectedDomains.length})</span>
          )}
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="mt-2 glass glow-border rounded-xl p-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(DOMAINS).map(([key, { label, color }]) => {
                const active = selectedDomains.length === 0 || selectedDomains.includes(key)
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 ${isInteractive ? 'cursor-pointer' : ''} transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
                    onClick={() => onToggleDomain?.(key)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: active ? `0 0 4px ${color}` : 'none' }}
                    />
                    <span className="text-gray-300 text-[10px] leading-tight">{label.split(' & ')[0]}</span>
                  </div>
                )
              })}
            </div>
            {selectedDomains.length > 0 && (
              <button
                onClick={() => onToggleDomain?.('__clear__')}
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

export default Legend
