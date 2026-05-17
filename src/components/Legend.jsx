import { useState } from 'react'
import DOMAINS from '../utils/domainConfig'

function Legend() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="absolute top-4 left-4 z-20">
      {/* Desktop: always visible */}
      <div className="hidden md:block glass glow-border rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-white text-sm font-orbitron tracking-wider mb-3 uppercase">Domains</h3>
        <div className="space-y-2">
          {Object.entries(DOMAINS).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="text-gray-300 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="glass glow-border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer"
        >
          <span className="text-white text-xs font-orbitron tracking-wider">Domains</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="mt-2 glass glow-border rounded-xl p-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(DOMAINS).map(([key, { label, color }]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
                  />
                  <span className="text-gray-300 text-[10px] leading-tight">{label.split(' & ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Legend
