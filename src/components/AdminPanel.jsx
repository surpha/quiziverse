import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { classifyQuestion, verifyAnswer, isLLMConfigured } from '../utils/llmJudge'

function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('pending') // 'pending' | 'staging' | 'repository'
  const [pending, setPending] = useState([])
  const [staging, setStaging] = useState([])
  const [approved, setApproved] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [classifying, setClassifying] = useState(null)
  const [aiResults, setAiResults] = useState({})
  const [verifying, setVerifying] = useState(null)
  const [verifyResults, setVerifyResults] = useState({})
  const [search, setSearch] = useState('')

  const fetchQuestions = useCallback(async () => {
    setLoading(true)

    const [pendingRes, stagingRes, approvedRes] = await Promise.all([
      supabase.from('questions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('questions').select('*').eq('status', 'staging').order('created_at', { ascending: false }),
      supabase.from('questions').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
    ])

    if (pendingRes.data) setPending(pendingRes.data)
    if (stagingRes.data) setStaging(stagingRes.data)
    if (approvedRes.data) setApproved(approvedRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleAction = async (id, status, editData) => {
    setActionLoading(id)
    const aiData = aiResults[id]
    const updatePayload = { status, reviewed_at: new Date().toISOString() }

    // If edits were provided (admin edited before approving), use those
    if (status === 'approved' && editData) {
      updatePayload.question = editData.question
      updatePayload.answer = editData.answer
      updatePayload.difficulty = editData.difficulty
      updatePayload.type = editData.type
      updatePayload.weights = editData.weights
      updatePayload.source = editData.source || null
      updatePayload.media_url = editData.media_url || null
    } else if (status === 'staging' && editData) {
      updatePayload.question = editData.question
      updatePayload.answer = editData.answer
      updatePayload.difficulty = editData.difficulty
      updatePayload.type = editData.type
      updatePayload.weights = editData.weights
      updatePayload.source = editData.source || null
      updatePayload.media_url = editData.media_url || null
    } else if (status === 'approved' && aiData) {
      updatePayload.difficulty = aiData.difficulty
      updatePayload.weights = aiData.weights
    }

    const { error } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      console.error('Update failed:', error.message)
      alert(`Action failed: ${error.message}`)
    } else {
      // Find the question from whichever list it was in
      const q = pending.find(p => p.id === id) || staging.find(s => s.id === id)
      // Remove from both source lists
      setPending(prev => prev.filter(item => item.id !== id))
      setStaging(prev => prev.filter(item => item.id !== id))

      if (status === 'staging' && q) {
        setStaging(prev => [{ ...q, ...updatePayload }, ...prev])
      } else if (status === 'approved' && q) {
        setApproved(prev => [{ ...q, ...updatePayload }, ...prev])
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

  const handleVerify = async (q) => {
    setVerifying(q.id)
    try {
      const result = await verifyAnswer(q.question, q.answer)
      setVerifyResults(prev => ({ ...prev, [q.id]: result }))
    } catch (err) {
      alert(`AI Verify failed: ${err.message}`)
    }
    setVerifying(null)
  }

  const getDomainTags = (weights) => {
    if (!weights) return []
    return Object.entries(weights)
      .filter(([, v]) => v >= 6)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key]) => key)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this question?')) return
    setActionLoading(id)
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (!error) {
      setPending(prev => prev.filter(q => q.id !== id))
      setStaging(prev => prev.filter(q => q.id !== id))
      setApproved(prev => prev.filter(q => q.id !== id))
    }
    setActionLoading(null)
  }

  const handleEditLive = async (id, editData) => {
    setActionLoading(id)
    const { error } = await supabase
      .from('questions')
      .update({
        question: editData.question,
        answer: editData.answer,
        difficulty: editData.difficulty,
        type: editData.type,
        weights: editData.weights,
        source: editData.source || null,
        media_url: editData.media_url || null,
      })
      .eq('id', id)
    if (error) {
      alert(`Edit failed: ${error.message}`)
    } else {
      setApproved(prev => prev.map(q => q.id === id ? { ...q, ...editData } : q))
    }
    setActionLoading(null)
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
            Pending
            {pending.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('staging')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              tab === 'staging' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Staging
            {staging.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{staging.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('repository')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              tab === 'repository' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Live
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
              verifying={verifying}
              verifyResults={verifyResults}
              onAction={handleAction}
              onClassify={handleClassify}
              onVerify={handleVerify}
              onDelete={handleDelete}
              getDomainTags={getDomainTags}
            />
          ) : tab === 'staging' ? (
            <StagingTab
              staging={staging}
              actionLoading={actionLoading}
              classifying={classifying}
              aiResults={aiResults}
              verifying={verifying}
              verifyResults={verifyResults}
              onAction={handleAction}
              onClassify={handleClassify}
              onVerify={handleVerify}
              onDelete={handleDelete}
              getDomainTags={getDomainTags}
            />
          ) : (
            <RepositoryTab
              questions={filteredApproved}
              search={search}
              onSearchChange={setSearch}
              onDelete={handleDelete}
              onEdit={handleEditLive}
              actionLoading={actionLoading}
              getDomainTags={getDomainTags}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function PendingTab({ pending, actionLoading, classifying, aiResults, verifying, verifyResults, onAction, onClassify, onVerify, onDelete, getDomainTags }) {
  const [expanded, setExpanded] = useState(null) // id of expanded question
  const [edits, setEdits] = useState({}) // { id: { question, answer, difficulty, type, weights } }

  if (pending.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No pending questions. All caught up!</p>
  }

  const toggleExpand = (q) => {
    if (expanded === q.id) {
      setExpanded(null)
    } else {
      setExpanded(q.id)
      if (!edits[q.id]) {
        setEdits(prev => ({ ...prev, [q.id]: {
          question: q.question,
          answer: q.answer,
          difficulty: q.difficulty || 5,
          type: q.type || 'straight',
          weights: q.weights || {},
          source: q.source || '',
          media_url: q.media_url || '',
        }}))
      }
    }
  }

  const updateEdit = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const updateWeight = (id, domain, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], weights: { ...prev[id].weights, [domain]: Number(value) } }
    }))
  }

  const handleApproveWithEdits = (id) => {
    const edit = edits[id]
    if (edit) {
      onAction(id, 'approved', edit)
    } else {
      onAction(id, 'approved')
    }
  }

  const handleStageWithEdits = (id) => {
    const edit = edits[id]
    if (edit) {
      onAction(id, 'staging', edit)
    } else {
      onAction(id, 'staging')
    }
  }

  return (
    <div className="space-y-4">
      {pending.map((q) => {
        const ai = aiResults[q.id]
        const vr = verifyResults[q.id]
        const isExpanded = expanded === q.id
        const edit = edits[q.id]
        return (
          <div key={q.id} className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
            {/* Question header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">{q.question}</p>
                <p className="text-gray-400 text-xs mb-3">{q.answer}</p>
              </div>
              <button
                onClick={() => toggleExpand(q)}
                className="text-gray-400 hover:text-purple-400 text-xs px-2 py-1 border border-gray-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {isExpanded ? '▲ Collapse' : '✎ Edit'}
              </button>
            </div>

            {/* Expanded edit form */}
            {isExpanded && edit && (
              <div className="border-t border-gray-700 mt-3 pt-3 space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Question</label>
                  <textarea
                    value={edit.question}
                    onChange={(e) => updateEdit(q.id, 'question', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer</label>
                  <textarea
                    value={edit.answer}
                    onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Difficulty ({edit.difficulty}/10)</label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={edit.difficulty}
                      onChange={(e) => updateEdit(q.id, 'difficulty', Number(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Type</label>
                    <select
                      value={edit.type}
                      onChange={(e) => updateEdit(q.id, 'type', e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                    >
                      {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => (
                        <option key={key} value={key}>{icon} {label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Credits / Source</label>
                    <input
                      type="text"
                      value={edit.source}
                      onChange={(e) => updateEdit(q.id, 'source', e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500 w-40"
                    />
                  </div>
                </div>
                {/* Media URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">YouTube / Media URL</label>
                  <input
                    type="url"
                    value={edit.media_url}
                    onChange={(e) => updateEdit(q.id, 'media_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                {/* Domain weights */}
                <div>
                  <label className="text-gray-400 text-xs block mb-2">Domain Weights</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    {DOMAIN_KEYS.map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAINS[key]?.color }} />
                        <span className="text-gray-300 text-xs w-20 truncate">{DOMAINS[key]?.label}</span>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={edit.weights[key] || 0}
                          onChange={(e) => updateWeight(q.id, key, e.target.value)}
                          className="w-16 h-1"
                        />
                        <span className="text-gray-500 text-xs w-4">{edit.weights[key] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Apply AI suggestion button */}
                {ai && (
                  <button
                    onClick={() => setEdits(prev => ({
                      ...prev,
                      [q.id]: { ...prev[q.id], difficulty: ai.difficulty, weights: ai.weights }
                    }))}
                    className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Apply AI suggestion values
                  </button>
                )}
              </div>
            )}

            {/* Original metadata (shown when collapsed) */}
            {!isExpanded && (
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
            )}

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

            {/* AI Verify result */}
            {vr && (
              <div className={`rounded-lg p-3 mb-3 border ${
                vr.verdict === 'correct' ? 'bg-green-900/30 border-green-500/30' :
                vr.verdict === 'partially_correct' ? 'bg-amber-900/30 border-amber-500/30' :
                'bg-red-900/30 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${
                    vr.verdict === 'correct' ? 'text-green-400' :
                    vr.verdict === 'partially_correct' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {vr.verdict === 'correct' ? '✅ Answer Verified' :
                     vr.verdict === 'partially_correct' ? '⚠️ Partially Correct' :
                     '❌ Answer Mismatch'}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mb-1"><span className="text-gray-500">AI's answer:</span> {vr.aiAnswer}</p>
                <p className="text-gray-400 text-xs italic">{vr.explanation}</p>
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
              {isLLMConfigured() && !vr && (
                <button
                  onClick={() => onVerify(q)}
                  disabled={verifying === q.id}
                  className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {verifying === q.id ? '🔄 Verifying...' : '🔍 AI Verify'}
                </button>
              )}
              <button
                onClick={() => handleApproveWithEdits(q.id)}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✓ Approve{isExpanded ? ' (with edits)' : ai ? ' (with AI values)' : ''}
              </button>
              <button
                onClick={() => handleStageWithEdits(q.id)}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ⏳ Stage
              </button>
              <button
                onClick={() => onAction(q.id, 'rejected')}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✗ Reject
              </button>
              <button
                onClick={() => onDelete(q.id)}
                disabled={actionLoading === q.id}
                className="px-3 py-1.5 bg-gray-700 hover:bg-red-700 disabled:opacity-50 text-gray-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer ml-auto"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StagingTab({ staging, actionLoading, classifying, aiResults, verifying, verifyResults, onAction, onClassify, onVerify, onDelete, getDomainTags }) {
  const [expanded, setExpanded] = useState(null)
  const [edits, setEdits] = useState({})

  if (staging.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No questions in staging. Move questions here from Pending for further review.</p>
  }

  const toggleExpand = (q) => {
    if (expanded === q.id) {
      setExpanded(null)
    } else {
      setExpanded(q.id)
      if (!edits[q.id]) {
        setEdits(prev => ({ ...prev, [q.id]: {
          question: q.question,
          answer: q.answer,
          difficulty: q.difficulty || 5,
          type: q.type || 'straight',
          weights: q.weights || {},
          source: q.source || '',
          media_url: q.media_url || '',
        }}))
      }
    }
  }

  const updateEdit = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const updateWeight = (id, domain, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], weights: { ...prev[id].weights, [domain]: Number(value) } }
    }))
  }

  const handleApproveWithEdits = (id) => {
    const edit = edits[id]
    if (edit) {
      onAction(id, 'approved', edit)
    } else {
      onAction(id, 'approved')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-amber-400/70 text-xs mb-2">Questions here are awaiting final approval from another admin before going live.</p>
      {staging.map((q) => {
        const ai = aiResults[q.id]
        const vr = verifyResults[q.id]
        const isExpanded = expanded === q.id
        const edit = edits[q.id]
        return (
          <div key={q.id} className="bg-gray-800/80 border border-amber-700/40 rounded-xl p-4">
            {/* Question header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium mb-1">{q.question}</p>
                <p className="text-gray-400 text-xs mb-3">{q.answer}</p>
              </div>
              <button
                onClick={() => toggleExpand(q)}
                className="text-gray-400 hover:text-purple-400 text-xs px-2 py-1 border border-gray-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {isExpanded ? '▲ Collapse' : '✎ Edit'}
              </button>
            </div>

            {/* Expanded edit form */}
            {isExpanded && edit && (
              <div className="border-t border-gray-700 mt-3 pt-3 space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Question</label>
                  <textarea
                    value={edit.question}
                    onChange={(e) => updateEdit(q.id, 'question', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer</label>
                  <textarea
                    value={edit.answer}
                    onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Difficulty ({edit.difficulty}/10)</label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={edit.difficulty}
                      onChange={(e) => updateEdit(q.id, 'difficulty', Number(e.target.value))}
                      className="w-32"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Type</label>
                    <select
                      value={edit.type}
                      onChange={(e) => updateEdit(q.id, 'type', e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                    >
                      {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => (
                        <option key={key} value={key}>{icon} {label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs block mb-1">Credits / Source</label>
                    <input
                      type="text"
                      value={edit.source}
                      onChange={(e) => updateEdit(q.id, 'source', e.target.value)}
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500 w-40"
                    />
                  </div>
                </div>
                {/* Media URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">YouTube / Media URL</label>
                  <input
                    type="url"
                    value={edit.media_url}
                    onChange={(e) => updateEdit(q.id, 'media_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                {/* Domain weights */}
                <div>
                  <label className="text-gray-400 text-xs block mb-2">Domain Weights</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                    {DOMAIN_KEYS.map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAINS[key]?.color }} />
                        <span className="text-gray-300 text-xs w-20 truncate">{DOMAINS[key]?.label}</span>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          value={edit.weights[key] || 0}
                          onChange={(e) => updateWeight(q.id, key, e.target.value)}
                          className="w-16 h-1"
                        />
                        <span className="text-gray-500 text-xs w-4">{edit.weights[key] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {ai && (
                  <button
                    onClick={() => setEdits(prev => ({
                      ...prev,
                      [q.id]: { ...prev[q.id], difficulty: ai.difficulty, weights: ai.weights }
                    }))}
                    className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Apply AI suggestion values
                  </button>
                )}
              </div>
            )}

            {/* Metadata when collapsed */}
            {!isExpanded && (
              <div className="flex flex-wrap gap-2 mb-2 text-xs">
                {q.type && QUESTION_TYPES[q.type] && (
                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    {QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}
                  </span>
                )}
                <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                  Difficulty {q.difficulty}/10
                </span>
                {getDomainTags(q.weights).map(d => (
                  <span key={d} className="px-2 py-0.5 rounded text-white/90" style={{ backgroundColor: DOMAINS[d]?.color + '55' }}>
                    {DOMAINS[d]?.label || d}
                  </span>
                ))}
              </div>
            )}

            {/* AI result */}
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
                {ai.reasoning && <p className="text-blue-300/70 text-xs italic">{ai.reasoning}</p>}
              </div>
            )}

            {/* AI Verify result */}
            {vr && (
              <div className={`rounded-lg p-3 mb-3 border ${
                vr.verdict === 'correct' ? 'bg-green-900/30 border-green-500/30' :
                vr.verdict === 'partially_correct' ? 'bg-amber-900/30 border-amber-500/30' :
                'bg-red-900/30 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${
                    vr.verdict === 'correct' ? 'text-green-400' :
                    vr.verdict === 'partially_correct' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {vr.verdict === 'correct' ? '✅ Answer Verified' :
                     vr.verdict === 'partially_correct' ? '⚠️ Partially Correct' :
                     '❌ Answer Mismatch'}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mb-1"><span className="text-gray-500">AI's answer:</span> {vr.aiAnswer}</p>
                <p className="text-gray-400 text-xs italic">{vr.explanation}</p>
              </div>
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
              {isLLMConfigured() && !vr && (
                <button
                  onClick={() => onVerify(q)}
                  disabled={verifying === q.id}
                  className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {verifying === q.id ? '🔄 Verifying...' : '🔍 AI Verify'}
                </button>
              )}
              <button
                onClick={() => handleApproveWithEdits(q.id)}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✓ Approve & Go Live{isExpanded ? ' (with edits)' : ''}
              </button>
              <button
                onClick={() => onAction(q.id, 'rejected')}
                disabled={actionLoading === q.id}
                className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                ✗ Reject
              </button>
              <button
                onClick={() => onDelete(q.id)}
                disabled={actionLoading === q.id}
                className="px-3 py-1.5 bg-gray-700 hover:bg-red-700 disabled:opacity-50 text-gray-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer ml-auto"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RepositoryTab({ questions, search, onSearchChange, onDelete, onEdit, actionLoading, getDomainTags }) {
  const [expanded, setExpanded] = useState(null)
  const [edits, setEdits] = useState({})
  const [editingId, setEditingId] = useState(null)

  const toggleExpand = (q) => {
    if (expanded === q.id) {
      setExpanded(null)
      setEditingId(null)
    } else {
      setExpanded(q.id)
    }
  }

  const startEditing = (q) => {
    setEditingId(q.id)
    if (!edits[q.id]) {
      setEdits(prev => ({ ...prev, [q.id]: {
        question: q.question,
        answer: q.answer,
        difficulty: q.difficulty || 5,
        type: q.type || 'straight',
        weights: q.weights || {},
        source: q.source || '',
        media_url: q.media_url || '',
      }}))
    }
  }

  const updateEdit = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const updateWeight = (id, domain, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], weights: { ...prev[id].weights, [domain]: Number(value) } }
    }))
  }

  const handleSave = (id) => {
    const edit = edits[id]
    if (edit) {
      onEdit(id, edit)
      setEditingId(null)
    }
  }

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
          {questions.map((q) => {
            const isExpanded = expanded === q.id
            const isEditing = editingId === q.id
            const edit = edits[q.id]
            return (
              <div key={q.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleExpand(q)}
                  >
                    <p className="text-white text-sm mb-1">{q.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleExpand(q)}
                      className="text-gray-500 hover:text-purple-400 text-xs cursor-pointer transition-colors"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      onClick={() => onDelete(q.id)}
                      disabled={actionLoading === q.id}
                      className="text-gray-500 hover:text-red-400 text-xs cursor-pointer transition-colors"
                      title="Delete question"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Collapsed metadata */}
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

                {/* Expanded details */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-gray-700 mt-3 pt-3 space-y-2">
                    <div>
                      <span className="text-gray-500 text-xs">Answer:</span>
                      <p className="text-gray-300 text-sm">{q.answer}</p>
                    </div>
                    {q.source && (
                      <p className="text-gray-500 text-xs">📖 Source: {q.source}</p>
                    )}
                    {q.media_url && (
                      <p className="text-gray-500 text-xs">🎬 Media: <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">{q.media_url}</a></p>
                    )}
                    {q.image_url && (
                      <img src={q.image_url} alt="Question" className="rounded-lg max-h-24 object-cover border border-gray-700" />
                    )}
                    {q.weights && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(q.weights)
                          .filter(([, v]) => v > 1)
                          .sort(([, a], [, b]) => b - a)
                          .map(([key, val]) => (
                            <span key={key} className="px-1.5 py-0.5 rounded text-xs text-white/80" style={{ backgroundColor: DOMAINS[key]?.color + '55' }}>
                              {DOMAINS[key]?.label || key}: {val}
                            </span>
                          ))}
                      </div>
                    )}
                    <button
                      onClick={() => startEditing(q)}
                      className="mt-2 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      ✎ Edit
                    </button>
                  </div>
                )}

                {/* Edit form */}
                {isExpanded && isEditing && edit && (
                  <div className="border-t border-gray-700 mt-3 pt-3 space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Question</label>
                      <textarea
                        value={edit.question}
                        onChange={(e) => updateEdit(q.id, 'question', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Answer</label>
                      <textarea
                        value={edit.answer}
                        onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Difficulty ({edit.difficulty}/10)</label>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={edit.difficulty}
                          onChange={(e) => updateEdit(q.id, 'difficulty', Number(e.target.value))}
                          className="w-32"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Type</label>
                        <select
                          value={edit.type}
                          onChange={(e) => updateEdit(q.id, 'type', e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                        >
                          {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => (
                            <option key={key} value={key}>{icon} {label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Credits / Source</label>
                        <input
                          type="text"
                          value={edit.source}
                          onChange={(e) => updateEdit(q.id, 'source', e.target.value)}
                          className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500 w-40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">YouTube / Media URL</label>
                      <input
                        type="url"
                        value={edit.media_url}
                        onChange={(e) => updateEdit(q.id, 'media_url', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-2">Domain Weights</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                        {DOMAIN_KEYS.map(key => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAINS[key]?.color }} />
                            <span className="text-gray-300 text-xs w-20 truncate">{DOMAINS[key]?.label}</span>
                            <input
                              type="range"
                              min={0}
                              max={10}
                              value={edit.weights[key] || 0}
                              onChange={(e) => updateWeight(q.id, key, e.target.value)}
                              className="w-16 h-1"
                            />
                            <span className="text-gray-500 text-xs w-4">{edit.weights[key] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSave(q.id)}
                        disabled={actionLoading === q.id}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      >
                        {actionLoading === q.id ? '...' : '✓ Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminPanel
