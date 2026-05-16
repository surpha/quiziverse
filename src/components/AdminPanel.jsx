import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { classifyQuestion, isLLMConfigured } from '../utils/llmJudge'

function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('pending') // 'pending' | 'repository'
  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [classifying, setClassifying] = useState(null)
  const [aiResults, setAiResults] = useState({}) // { questionId: { difficulty, weights, reasoning } }
  const [search, setSearch] = useState('')

  const fetchQuestions = useCallback(async () => {
    setLoading(true)

    const [pendingRes, approvedRes] = await Promise.all([
      supabase.from('questions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('questions').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
    ])

    if (pendingRes.data) setPending(pendingRes.data)
    if (approvedRes.data) setApproved(approvedRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleAction = async (id, status) => {
    setActionLoading(id)
    // If AI suggested values, apply them on approve
    const aiData = aiResults[id]
    const updatePayload = { status, reviewed_at: new Date().toISOString() }
    if (status === 'approved' && aiData) {
      updatePayload.difficulty = aiData.difficulty
      updatePayload.weights = aiData.weights
    }

    const { error } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', id)

    if (!error) {
      setPending(prev => prev.filter(q => q.id !== id))
      if (status === 'approved') {
        const q = pending.find(p => p.id === id)
        if (q) setApproved(prev => [{ ...q, ...updatePayload }, ...prev])
      }
    }
    setActionLoading(null)
  }

  const handleClassify = async (q) => {
    setClassifying(q.id)
    try {
      const result = await classifyQuestion(q.question, q.answer)
      setAiResults(prev => ({ ...prev, [q.id]: result }))
    } catch (err) {
      alert(`AI Classification failed: ${err.message}`)
    }
    setClassifying(null)
  }

  const getDomainTags = (weights) => {
    if (!weights) return []
    return Object.entries(weights)
      .filter(([, v]) => v >= 6)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key]) => key)
  }

  const filteredApproved = approved.filter(q =>
    !search || q.question.toLowerCase().includes(search.toLowerCase()) ||
    q.answer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-3xl w-[95%] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-500/20 backdrop-blur-sm flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer z-10"
        >
          &times;
        </button>

        {/* Header */}
        <h2 className="text-white text-lg font-semibold mb-3">Admin Panel</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-700/50 pb-2">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              tab === 'pending' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Pending Review
            {pending.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('repository')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              tab === 'repository' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Question Repository
            <span className="ml-2 text-gray-500 text-xs">{approved.length}</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-purple-400 text-sm animate-pulse py-8 text-center">Loading...</p>
          ) : tab === 'pending' ? (
            <PendingTab
              pending={pending}
              actionLoading={actionLoading}
              classifying={classifying}
              aiResults={aiResults}
              onAction={handleAction}
              onClassify={handleClassify}
              getDomainTags={getDomainTags}
            />
          ) : (
            <RepositoryTab
              questions={filteredApproved}
              search={search}
              onSearchChange={setSearch}
              getDomainTags={getDomainTags}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function PendingTab({ pending, actionLoading, classifying, aiResults, onAction, onClassify, getDomainTags }) {
  if (pending.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No pending questions. All caught up!</p>
  }

  return (
    <div className="space-y-4">
      {pending.map((q) => {
        const ai = aiResults[q.id]
        return (
          <div key={q.id} className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
            {/* Question */}
            <p className="text-white text-sm font-medium mb-1">{q.question}</p>
            <p className="text-gray-400 text-xs mb-3">{q.answer}</p>

            {/* Original metadata */}
            <div className="flex flex-wrap gap-2 mb-2 text-xs">
              {q.type && QUESTION_TYPES[q.type] && (
                <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  {QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}
                </span>
              )}
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                Submitted: Difficulty {q.difficulty}/10
              </span>
              {q.source && (
                <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded truncate max-w-[200px]">
                  📖 {q.source}
                </span>
              )}
              {getDomainTags(q.weights).map(d => (
                <span key={d} className="px-2 py-0.5 rounded text-white/90" style={{ backgroundColor: DOMAINS[d]?.color + '55' }}>
                  {DOMAINS[d]?.label || d}
                </span>
              ))}
            </div>

            {/* AI Classification result */}
            {ai && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-blue-400 text-xs font-medium">🤖 AI Suggestion</span>
                  <span className="text-blue-300 text-xs">Difficulty: {ai.difficulty}/10</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {getDomainTags(ai.weights).map(d => (
                    <span key={d} className="px-2 py-0.5 rounded text-xs text-white/90" style={{ backgroundColor: DOMAINS[d]?.color + '77' }}>
                      {DOMAINS[d]?.label} ({ai.weights[d]})
                    </span>
                  ))}
                </div>
                {ai.reasoning && (
                  <p className="text-blue-300/70 text-xs italic">{ai.reasoning}</p>
                )}
              </div>
            )}

            {/* Image preview */}
            {q.image_url && (
              <img src={q.image_url} alt="Question image" className="rounded-lg max-h-24 object-cover mb-3 border border-gray-700" />
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {isLLMConfigured() && !ai && (
                <button
                  onClick={() => onClassify(q)}
                  disabled={classifying === q.id}
                  className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {classifying === q.id ? '🔄 Classifying...' : '🤖 AI Classify'}
                </button>
              )}
              <button
                onClick={() => onAction(q.id, 'approved')}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✓ Approve{ai ? ' (with AI values)' : ''}
              </button>
              <button
                onClick={() => onAction(q.id, 'rejected')}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✗ Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RepositoryTab({ questions, search, onSearchChange, getDomainTags }) {
  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          placeholder="Search questions..."
        />
      </div>

      {/* Stats */}
      <p className="text-gray-500 text-xs mb-3">
        {questions.length} approved question{questions.length !== 1 ? 's' : ''} in the Quiziverse
      </p>

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">
          {search ? 'No questions match your search.' : 'No approved questions yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
              <p className="text-white text-sm mb-1">{q.question}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-gray-500">Diff: {q.difficulty}/10</span>
                {q.type && QUESTION_TYPES[q.type] && (
                  <span className="text-gray-500">{QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}</span>
                )}
                {getDomainTags(q.weights).map(d => (
                  <span key={d} className="px-1.5 py-0.5 rounded text-white/80" style={{ backgroundColor: DOMAINS[d]?.color + '44' }}>
                    {DOMAINS[d]?.label || d}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
