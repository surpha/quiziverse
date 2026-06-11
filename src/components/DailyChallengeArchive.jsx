import { useState } from 'react'
import { useDailyChallengeDates } from '../hooks/useDailyChallengeByDate'

// Get today's date in user's local timezone as YYYY-MM-DD
function getToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function DailyChallengeArchive({ userId, onSelectDate, onClose }) {
  const { dates, loading } = useDailyChallengeDates(userId)
  const today = getToday()

  // Calendar state
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1)

  // Build a lookup: date string -> challenge info
  const dateMap = {}
  for (const d of dates) {
    dateMap[d.date] = d
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const handleDayClick = (dateStr) => {
    const info = dateMap[dateStr]
    if (info) {
      onSelectDate(dateStr)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="glass glow-border rounded-2xl p-6 max-w-md w-[92%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="text-white text-sm font-orbitron tracking-wider">Challenge Archives</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
        </div>

        {loading ? (
          <p className="text-cyan-400 text-sm animate-pulse text-center py-8">Loading archives...</p>
        ) : (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="text-gray-400 hover:text-cyan-300 text-lg px-2 cursor-pointer">‹</button>
              <span className="text-white text-sm font-orbitron tracking-wider">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="text-gray-400 hover:text-cyan-300 text-lg px-2 cursor-pointer">›</button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-gray-500 text-xs font-medium">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const info = dateMap[dateStr]
                const isToday = dateStr === today
                const hasChallenge = !!info
                const isCompleted = info?.completed
                const isFuture = dateStr > today

                let bgClass = 'bg-gray-800/30'
                let textClass = 'text-gray-600'
                let ringClass = ''

                if (isFuture) {
                  textClass = 'text-gray-700'
                } else if (hasChallenge && isCompleted) {
                  bgClass = 'bg-emerald-900/40'
                  textClass = 'text-emerald-300'
                  ringClass = 'ring-1 ring-emerald-500/40'
                } else if (hasChallenge && !isCompleted) {
                  bgClass = 'bg-amber-900/30'
                  textClass = 'text-amber-300'
                  ringClass = 'ring-1 ring-amber-500/40'
                } else if (!hasChallenge && !isFuture) {
                  textClass = 'text-gray-500'
                }

                if (isToday) {
                  ringClass = 'ring-2 ring-cyan-400/60'
                }

                return (
                  <button
                    key={day}
                    onClick={() => hasChallenge && handleDayClick(dateStr)}
                    disabled={!hasChallenge}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center transition-all ${bgClass} ${textClass} ${ringClass} ${hasChallenge ? 'cursor-pointer hover:scale-105 hover:brightness-125' : 'cursor-default'}`}
                  >
                    <span className="text-xs font-medium">{day}</span>
                    {hasChallenge && isCompleted && (
                      <span className="text-[8px] leading-none">✓</span>
                    )}
                    {hasChallenge && !isCompleted && (
                      <span className="text-[8px] leading-none">●</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-900/40 ring-1 ring-emerald-500/40" />
                <span className="text-gray-400 text-[10px]">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-900/30 ring-1 ring-amber-500/40" />
                <span className="text-gray-400 text-[10px]">Not played</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-800/30 ring-2 ring-cyan-400/60" />
                <span className="text-gray-400 text-[10px]">Today</span>
              </div>
            </div>

            {/* Stats summary */}
            {dates.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                <span className="text-gray-400 text-xs">
                  {dates.filter(d => d.completed).length}/{dates.length} completed
                </span>
                <span className="text-gray-500 text-xs">
                  Total: {dates.filter(d => d.completed).reduce((s, d) => s + d.score, 0)} pts
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
