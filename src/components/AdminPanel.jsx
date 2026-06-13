import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { classifyQuestion, factCheckAnswer, generateHints, isLLMConfigured } from '../utils/llmJudge'
import DailyChallengeAdmin from './DailyChallengeAdmin'
import { useDisputes } from '../hooks/useDisputes'

function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('pending') // 'pending' | 'staging' | 'repository' | 'daily' | 'disputes' | 'notifications'
  const [pending, setPending] = useState([])
  const [staging, setStaging] = useState([])
  const [approved, setApproved] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [classifying, setClassifying] = useState(null)
  const [aiResults, setAiResults] = useState({})
  const [verifying, setVerifying] = useState(null)
  const [verifyResults, setVerifyResults] = useState({})
  const [hinting, setHinting] = useState(null)
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
      updatePayload.answer_image_url = editData.answer_image_url || null
      updatePayload.answer_media_url = editData.answer_media_url || null
      updatePayload.answer_explanation = editData.answer_explanation || null
      updatePayload.hints = editData.hints || null
    } else if (status === 'staging' && editData) {
      updatePayload.question = editData.question
      updatePayload.answer = editData.answer
      updatePayload.difficulty = editData.difficulty
      updatePayload.type = editData.type
      updatePayload.weights = editData.weights
      updatePayload.source = editData.source || null
      updatePayload.media_url = editData.media_url || null
      updatePayload.answer_image_url = editData.answer_image_url || null
      updatePayload.answer_media_url = editData.answer_media_url || null
      updatePayload.answer_explanation = editData.answer_explanation || null
      updatePayload.hints = editData.hints || null
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
      const result = await factCheckAnswer(q.question, q.answer)
      setVerifyResults(prev => ({ ...prev, [q.id]: result }))
    } catch (err) {
      alert(`AI Verify failed: ${err.message}`)
    }
    setVerifying(null)
  }

  const handleGenerateHints = async (q) => {
    setHinting(q.id)
    try {
      const hints = await generateHints(q.question, q.answer)
      // Update the question's hints in whichever list it belongs to
      const updateHints = (list) => list.map(item => item.id === q.id ? { ...item, hints } : item)
      setPending(updateHints)
      setStaging(updateHints)
      setApproved(updateHints)
    } catch (err) {
      alert(`AI Hints failed: ${err.message}`)
    }
    setHinting(null)
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
    const { error, count } = await supabase.from('questions').delete({ count: 'exact' }).eq('id', id)
    if (error) {
      console.error('Delete failed:', error.message)
      alert(`Delete failed: ${error.message}`)
    } else {
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
        answer_image_url: editData.answer_image_url || null,
        answer_media_url: editData.answer_media_url || null,
        answer_explanation: editData.answer_explanation || null,
        hints: editData.hints || null,
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
      <div className="pointer-events-auto relative glass glow-border rounded-2xl p-6 max-w-3xl w-[95%] max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer z-10"
        >
          &times;
        </button>

        {/* Header */}
        <h2 className="text-white text-lg font-orbitron tracking-wider mb-3">Admin Panel</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-700/50 pb-2 overflow-x-auto">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'pending' ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Pending
            {pending.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('staging')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'staging' ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Staging
            {staging.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{staging.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab('repository')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'repository' ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Live
            <span className="ml-2 text-gray-500 text-xs">{approved.length}</span>
          </button>
          <button
            onClick={() => setTab('daily')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'daily' ? 'glass text-amber-300 ring-1 ring-amber-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            📅 Daily
          </button>
          <button
            onClick={() => setTab('disputes')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'disputes' ? 'glass text-orange-300 ring-1 ring-orange-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            ⚠ Disputes
          </button>
          <button
            onClick={() => setTab('notifications')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'notifications' ? 'glass text-purple-300 ring-1 ring-purple-500/50' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            🔔 Notify
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-cyan-400 text-sm animate-pulse py-8 text-center">Loading...</p>
          ) : tab === 'pending' ? (
            <PendingTab
              pending={pending}
              actionLoading={actionLoading}
              classifying={classifying}
              aiResults={aiResults}
              verifying={verifying}
              verifyResults={verifyResults}
              hinting={hinting}
              onAction={handleAction}
              onClassify={handleClassify}
              onVerify={handleVerify}
              onGenerateHints={handleGenerateHints}
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
              hinting={hinting}
              onAction={handleAction}
              onClassify={handleClassify}
              onVerify={handleVerify}
              onGenerateHints={handleGenerateHints}
              onDelete={handleDelete}
              getDomainTags={getDomainTags}
            />
          ) : tab === 'repository' ? (
            <RepositoryTab
              questions={filteredApproved}
              search={search}
              onSearchChange={setSearch}
              onDelete={handleDelete}
              onEdit={handleEditLive}
              onGenerateHints={handleGenerateHints}
              hinting={hinting}
              actionLoading={actionLoading}
              getDomainTags={getDomainTags}
            />
          ) : tab === 'disputes' ? (
            <DisputesTab />
          ) : tab === 'notifications' ? (
            <NotifyTab />
          ) : (
            <DailyChallengeAdmin />
          )}
        </div>
      </div>
    </div>
  )
}

function PendingTab({ pending, actionLoading, classifying, aiResults, verifying, verifyResults, hinting, onAction, onClassify, onVerify, onGenerateHints, onDelete, getDomainTags }) {
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
          answer_image_url: q.answer_image_url || '',
          answer_media_url: q.answer_media_url || '',
          answer_explanation: q.answer_explanation || '',
          hints: q.hints || ['', '', ''],
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
                className="text-gray-400 hover:text-cyan-400 text-xs px-2 py-1 border border-gray-700 rounded-lg transition-colors cursor-pointer shrink-0"
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
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer</label>
                  <textarea
                    value={edit.answer}
                    onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
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
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
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
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 w-40"
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
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                {/* Answer Image URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Image URL</label>
                  <input
                    type="url"
                    value={edit.answer_image_url}
                    onChange={(e) => updateEdit(q.id, 'answer_image_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://... (shown on answer reveal)"
                  />
                </div>
                {/* Answer Media URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Media URL</label>
                  <input
                    type="url"
                    value={edit.answer_media_url}
                    onChange={(e) => updateEdit(q.id, 'answer_media_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://youtube.com/... (shown on answer reveal)"
                  />
                </div>
                {/* Answer Explanation */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Explanation</label>
                  <textarea
                    value={edit.answer_explanation}
                    onChange={(e) => updateEdit(q.id, 'answer_explanation', e.target.value)}
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                    placeholder="Explanation shown after answer reveal..."
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
                  className="px-3 py-1.5 glass glow-border disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {verifying === q.id ? '🔄 Verifying...' : '🔍 AI Verify'}
                </button>
              )}
              {isLLMConfigured() && (
                <button
                  onClick={() => onGenerateHints(q)}
                  disabled={hinting === q.id}
                  className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {hinting === q.id ? '🔄 Hinting...' : '💡 AI Hints'}
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

function StagingTab({ staging, actionLoading, classifying, aiResults, verifying, verifyResults, hinting, onAction, onClassify, onVerify, onGenerateHints, onDelete, getDomainTags }) {
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
          answer_image_url: q.answer_image_url || '',
          answer_media_url: q.answer_media_url || '',
          answer_explanation: q.answer_explanation || '',
          hints: q.hints || ['', '', ''],
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
                className="text-gray-400 hover:text-cyan-400 text-xs px-2 py-1 border border-gray-700 rounded-lg transition-colors cursor-pointer shrink-0"
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
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer</label>
                  <textarea
                    value={edit.answer}
                    onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
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
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
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
                      className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 w-40"
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
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                {/* Answer Image URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Image URL</label>
                  <input
                    type="url"
                    value={edit.answer_image_url}
                    onChange={(e) => updateEdit(q.id, 'answer_image_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://... (shown on answer reveal)"
                  />
                </div>
                {/* Answer Media URL */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Media URL</label>
                  <input
                    type="url"
                    value={edit.answer_media_url}
                    onChange={(e) => updateEdit(q.id, 'answer_media_url', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    placeholder="https://youtube.com/... (shown on answer reveal)"
                  />
                </div>
                {/* Answer Explanation */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Answer Explanation</label>
                  <textarea
                    value={edit.answer_explanation}
                    onChange={(e) => updateEdit(q.id, 'answer_explanation', e.target.value)}
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                    placeholder="Explanation shown after answer reveal..."
                  />
                </div>
                {/* Hints */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Hints (optional)</label>
                  <div className="space-y-1.5">
                    {[0, 1, 2].map(i => (
                      <input
                        key={i}
                        type="text"
                        value={(edit.hints || ['', '', ''])[i] || ''}
                        onChange={(e) => {
                          const newHints = [...(edit.hints || ['', '', ''])]
                          newHints[i] = e.target.value
                          updateEdit(q.id, 'hints', newHints)
                        }}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                        placeholder={`Hint #${i + 1}`}
                      />
                    ))}
                  </div>
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
                  className="px-3 py-1.5 glass glow-border disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {verifying === q.id ? '🔄 Verifying...' : '🔍 AI Verify'}
                </button>
              )}
              {isLLMConfigured() && (
                <button
                  onClick={() => onGenerateHints(q)}
                  disabled={hinting === q.id}
                  className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {hinting === q.id ? '🔄 Hinting...' : '💡 AI Hints'}
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

function RepositoryTab({ questions, search, onSearchChange, onDelete, onEdit, onGenerateHints, hinting, actionLoading, getDomainTags }) {
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
        answer_image_url: q.answer_image_url || '',
        answer_media_url: q.answer_media_url || '',
        answer_explanation: q.answer_explanation || '',
        hints: q.hints || ['', '', ''],
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
          className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
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
                      className="text-gray-500 hover:text-cyan-400 text-xs cursor-pointer transition-colors"
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
                      <p className="text-gray-500 text-xs">🎬 Media: <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">{q.media_url}</a></p>
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
                      className="mt-2 px-3 py-1.5 glass glow-border text-cyan-300 text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      ✎ Edit
                    </button>
                    {isLLMConfigured() && (
                      <button
                        onClick={() => onGenerateHints(q)}
                        disabled={hinting === q.id}
                        className="mt-2 ml-2 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        {hinting === q.id ? '🔄 Hinting...' : '💡 AI Hints'}
                      </button>
                    )}
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
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Answer</label>
                      <textarea
                        value={edit.answer}
                        onChange={(e) => updateEdit(q.id, 'answer', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
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
                          className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
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
                          className="bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 w-40"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">YouTube / Media URL</label>
                      <input
                        type="url"
                        value={edit.media_url}
                        onChange={(e) => updateEdit(q.id, 'media_url', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Answer Image URL</label>
                      <input
                        type="url"
                        value={edit.answer_image_url}
                        onChange={(e) => updateEdit(q.id, 'answer_image_url', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                        placeholder="https://... (shown on answer reveal)"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Answer Media URL</label>
                      <input
                        type="url"
                        value={edit.answer_media_url}
                        onChange={(e) => updateEdit(q.id, 'answer_media_url', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                        placeholder="https://youtube.com/... (shown on answer reveal)"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Answer Explanation</label>
                      <textarea
                        value={edit.answer_explanation}
                        onChange={(e) => updateEdit(q.id, 'answer_explanation', e.target.value)}
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                        placeholder="Explanation shown after answer reveal..."
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs block mb-1">Hints (optional)</label>
                      <div className="space-y-1.5">
                        {[0, 1, 2].map(i => (
                          <input
                            key={i}
                            type="text"
                            value={(edit.hints || ['', '', ''])[i] || ''}
                            onChange={(e) => {
                              const newHints = [...(edit.hints || ['', '', ''])]
                              newHints[i] = e.target.value
                              updateEdit(q.id, 'hints', newHints)
                            }}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                            placeholder={`Hint #${i + 1}`}
                          />
                        ))}
                      </div>
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

function DisputesTab() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending' | 'all'
  const [resolving, setResolving] = useState(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchDisputes = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('disputes').select('*').order('created_at', { ascending: false })
    if (filter === 'pending') query = query.eq('status', 'pending')
    const { data } = await query
    setDisputes(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchDisputes() }, [fetchDisputes])

  const handleResolve = async (disputeId, resolution) => {
    setResolving(disputeId)
    const dispute = disputes.find(d => d.id === disputeId)

    // Update dispute status
    await supabase.from('disputes').update({
      status: resolution,
      admin_note: adminNote || null,
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', disputeId)

    // If approved, fix the user's attempt
    if (resolution === 'approved' && dispute) {
      // Check if it's a daily challenge dispute (format: daily-{challengeId}-{questionIndex})
      const dailyMatch = dispute.question_id.match(/^daily-(.+)-(\d+)$/)
      if (dailyMatch) {
        const [, challengeId, qIndex] = dailyMatch
        const idx = parseInt(qIndex)
        // Fetch the daily_attempts row and update the verdict in the answers JSON
        const { data: attempt } = await supabase
          .from('daily_attempts')
          .select('id, answers, total_score')
          .eq('user_id', dispute.user_id)
          .eq('challenge_id', challengeId)
          .single()

        if (attempt && attempt.answers) {
          const answers = [...attempt.answers]
          if (answers[idx]) {
            const oldScore = answers[idx].score || 0
            const maxScore = 10 // default max
            answers[idx] = { ...answers[idx], verdict: 'correct', score: maxScore }
            const scoreDiff = maxScore - oldScore
            await supabase.from('daily_attempts').update({
              answers,
              total_score: (attempt.total_score || 0) + scoreDiff,
            }).eq('id', attempt.id)
          }
        }
      } else {
        // Regular play mode dispute
        await supabase.from('play_attempts').update({ verdict: 'correct' })
          .eq('user_id', dispute.user_id)
          .eq('question_id', dispute.question_id)
      }
    }

    // Send notification
    if (dispute) {
      await supabase.from('notifications').insert({
        user_id: dispute.user_id,
        type: resolution === 'approved' ? 'dispute_approved' : 'dispute_rejected',
        title: resolution === 'approved' ? 'Dispute Approved ✓' : 'Dispute Reviewed',
        message: resolution === 'approved'
          ? `Your answer "${dispute.user_answer}" for "${dispute.question_text.slice(0, 50)}..." has been marked correct!`
          : `Your dispute for "${dispute.question_text.slice(0, 50)}..." was reviewed. ${adminNote || 'The original verdict stands.'}`,
        metadata: { dispute_id: disputeId, question_id: dispute.question_id },
      })
    }

    setAdminNote('')
    setResolving(null)
    fetchDisputes()
  }

  if (loading) return <p className="text-cyan-400 text-sm animate-pulse py-8 text-center">Loading disputes...</p>

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 text-xs rounded-lg cursor-pointer ${filter === 'pending' ? 'glass text-orange-300 ring-1 ring-orange-500/50' : 'text-gray-400 hover:text-white'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs rounded-lg cursor-pointer ${filter === 'all' ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white'}`}
        >
          All
        </button>
      </div>

      {disputes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No {filter === 'pending' ? 'pending ' : ''}disputes</p>
      ) : (
        disputes.map(d => (
          <div key={d.id} className="bg-gray-800/80 border border-gray-700 rounded-xl p-4 space-y-3">
            {/* Question */}
            <div>
              <p className="text-cyan-400/60 text-xs font-orbitron tracking-wider mb-1">Question</p>
              <p className="text-white text-sm">{d.question_text}</p>
            </div>

            {/* Answers comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-emerald-400/60 text-xs mb-1">Correct Answer</p>
                <p className="text-emerald-300 text-sm">{d.correct_answer}</p>
              </div>
              <div>
                <p className="text-amber-400/60 text-xs mb-1">User's Answer</p>
                <p className="text-amber-300 text-sm">{d.user_answer}</p>
              </div>
            </div>

            {/* LLM verdict & user reason */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-red-400">LLM said: {d.llm_verdict}</span>
              {d.user_reason && <span className="text-gray-400">Reason: "{d.user_reason}"</span>}
            </div>

            {/* Status badge */}
            {d.status !== 'pending' && (
              <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                d.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {d.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                {d.admin_note && ` — ${d.admin_note}`}
              </span>
            )}

            {/* Admin actions (only for pending) */}
            {d.status === 'pending' && (
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Admin note (optional)"
                  value={resolving === d.id ? adminNote : ''}
                  onFocus={() => setResolving(d.id)}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full glass rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(d.id, 'approved')}
                    disabled={resolving === d.id && resolving !== d.id}
                    className="px-4 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    ✓ Approve (mark correct)
                  </button>
                  <button
                    onClick={() => handleResolve(d.id, 'rejected')}
                    className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            )}

            {/* Meta */}
            <p className="text-gray-600 text-[10px]">
              {new Date(d.created_at).toLocaleString()} · User: {d.user_id.slice(0, 8)}...
            </p>
          </div>
        ))
      )}
    </div>
  )
}

function NotifyTab() {
  const [target, setTarget] = useState('all') // 'all' | 'user'
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [users, setUsers] = useState([])
  const [searchUser, setSearchUser] = useState('')

  // Fetch users for autocomplete
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name, username')
        .order('display_name')
      setUsers(data || [])
    }
    fetchUsers()
  }, [])

  const filteredUsers = searchUser
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchUser.toLowerCase())
      )
    : []

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: 'error', text: 'Title and message are required' })
      return
    }
    if (target === 'user' && !userId) {
      setResult({ type: 'error', text: 'Select a user' })
      return
    }

    setSending(true)
    setResult(null)

    try {
      if (target === 'all') {
        // Send to all users
        const notifications = users.map(u => ({
          user_id: u.id,
          type,
          title: title.trim(),
          message: message.trim(),
          metadata: { broadcast: true },
        }))

        const { error } = await supabase.from('notifications').insert(notifications)
        if (error) throw error
        setResult({ type: 'success', text: `Sent to ${users.length} users` })
      } else {
        // Send to specific user
        const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          type,
          title: title.trim(),
          message: message.trim(),
          metadata: {},
        })
        if (error) throw error
        const user = users.find(u => u.id === userId)
        setResult({ type: 'success', text: `Sent to ${user?.display_name || user?.username || 'user'}` })
      }

      setTitle('')
      setMessage('')
    } catch (err) {
      setResult({ type: 'error', text: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white font-orbitron text-sm tracking-wider">Send Notification</h3>

      {/* Target selection */}
      <div className="flex gap-2">
        <button
          onClick={() => setTarget('all')}
          className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${target === 'all' ? 'glass text-purple-300 ring-1 ring-purple-500/50' : 'text-gray-400 hover:text-white'}`}
        >
          All Users ({users.length})
        </button>
        <button
          onClick={() => setTarget('user')}
          className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${target === 'user' ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white'}`}
        >
          Specific User
        </button>
      </div>

      {/* User picker */}
      {target === 'user' && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search user by name, username, or email..."
            value={searchUser}
            onChange={(e) => { setSearchUser(e.target.value); setUserId('') }}
            className="w-full glass rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
          {filteredUsers.length > 0 && !userId && (
            <div className="absolute top-full mt-1 w-full glass rounded-lg overflow-hidden z-10 max-h-40 overflow-y-auto">
              {filteredUsers.slice(0, 8).map(u => (
                <button
                  key={u.id}
                  onClick={() => { setUserId(u.id); setSearchUser(u.display_name || u.username || u.email) }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-cyan-900/30 cursor-pointer"
                >
                  <span className="font-medium">{u.display_name || u.username || 'Unnamed'}</span>
                  {u.email && <span className="text-gray-500 ml-2">{u.email}</span>}
                </button>
              ))}
            </div>
          )}
          {userId && <p className="text-emerald-400 text-xs mt-1">✓ Selected</p>}
        </div>
      )}

      {/* Notification type */}
      <div>
        <label className="text-gray-400 text-xs mb-1 block">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="glass rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="info">🔔 Info</option>
          <option value="daily">📅 Daily</option>
          <option value="achievement">🏆 Achievement</option>
        </select>
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Notification title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full glass rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />

      {/* Message */}
      <textarea
        placeholder="Notification message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full glass rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full px-4 py-2.5 bg-purple-600/80 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
      >
        {sending ? 'Sending...' : `Send to ${target === 'all' ? 'All Users' : 'User'}`}
      </button>

      {/* Result message */}
      {result && (
        <p className={`text-xs ${result.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.text}
        </p>
      )}
    </div>
  )
}

export default AdminPanel
