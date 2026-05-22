import { useState } from 'react'
import QUESTION_TYPES from '../utils/questionTypes'

function TypeFilter({ selectedTypes = [], onToggleType }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="glass glow-border rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-white text-sm font-orbitron tracking-wider uppercase cursor-pointer hover:bg-white/5 transition-colors"
      >
        <span>Types</span>
        <span className="text-gray-400 text-xs">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 max-h-[40vh] overflow-y-auto">
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
      )}
    </div>
  )
}

export default TypeFilter
