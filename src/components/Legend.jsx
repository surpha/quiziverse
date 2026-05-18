import DOMAINS from '../utils/domainConfig'

function Legend({ selectedDomains = [], onToggleDomain }) {
  const isInteractive = !!onToggleDomain

  return (
    <div data-tour="legend" className="absolute top-4 left-4 z-20 hidden md:block">
      {/* Desktop: always visible */}
      <div className="glass glow-border rounded-xl p-4 max-h-[80vh] overflow-y-auto">
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
    </div>
  )
}

export default Legend
