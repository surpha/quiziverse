import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'

function AdminPanel({ onClose }) {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (!error && data) setPending(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleAction = async (id, status) => {
    setActionLoading(id)
    const { error } = await supabase
      .from('questions')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setPending(prev => prev.filter(q => q.id !== id))
    }
    setActionLoading(null)
  }

  const getDomainTags = (weights) => {
    if (!weights) return []
    return Object.entries(weights)
      .filter(([, v]) => v >= 6)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key)
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/20 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-semibold mb-1">Admin Review Panel</h2>
        <p className="text-gray-400 text-sm mb-4">
          {pending.length} question{pending.length !== 1 ? 's' : ''} pending review
        </p>

        {loading ? (
          <p className="text-purple-400 text-sm animate-pulse py-8 text-center">Loading pending questions...</p>
        ) : pending.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No pending questions. All caught up!</p>
        ) : (
          <div className="space-y-4">
            {pending.map((q) => (
              <div
                key={q.id}
                className="bg-gray-800/80 border border-gray-700 rounded-xl p-4"
              >
                {/* Question */}
                <p className="text-white text-sm font-medium mb-1">{q.question}</p>
                <p className="text-gray-400 text-xs mb-2">{q.answer}</p>

                {/* Metadata row */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  {q.type && QUESTION_TYPES[q.type] && (
                    <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}
                    </span>
                  )}
                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    Difficulty: {q.difficulty}/10
                  </span>
                  {q.source && (
                    <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded truncate max-w-[200px]">
                      📖 {q.source}
                    </span>
                  )}
                  {getDomainTags(q.weights).map(d => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded text-white/90"
                      style={{ backgroundColor: DOMAINS[d]?.color + '55' }}
                    >
                      {DOMAINS[d]?.label || d}
                    </span>
                  ))}
                </div>

                {/* Image preview */}
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt="Question image"
                    className="rounded-lg max-h-32 object-cover mb-3 border border-gray-700"
                  />
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(q.id, 'approved')}
                    disabled={actionLoading === q.id}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleAction(q.id, 'rejected')}
                    disabled={actionLoading === q.id}
                    className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel
