import { useState } from 'react'

export default function NotificationsPanel({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onClose }) {
  const [filter, setFilter] = useState('unread') // 'unread' | 'all'

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const getIcon = (type) => {
    switch (type) {
      case 'dispute_approved': return '✓'
      case 'dispute_rejected': return '✗'
      case 'daily': return '📅'
      case 'achievement': return '🏆'
      default: return '🔔'
    }
  }

  const getColor = (type) => {
    switch (type) {
      case 'dispute_approved': return 'text-emerald-400'
      case 'dispute_rejected': return 'text-red-400'
      case 'daily': return 'text-amber-400'
      case 'achievement': return 'text-purple-400'
      default: return 'text-cyan-400'
    }
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 max-h-[70vh] glass glow-border rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
          <h3 className="text-white font-orbitron text-sm tracking-wider">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-cyan-400 text-xs hover:text-cyan-300 cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 px-4 py-2 border-b border-gray-800/50">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 text-xs rounded cursor-pointer ${filter === 'all' ? 'text-cyan-300 bg-cyan-900/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-2 py-0.5 text-xs rounded cursor-pointer ${filter === 'unread' ? 'text-cyan-300 bg-cyan-900/30' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications list */}
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkAsRead(n.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    n.read ? 'opacity-60 hover:opacity-80' : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-sm ${getColor(n.type)}`}>{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-gray-600 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
