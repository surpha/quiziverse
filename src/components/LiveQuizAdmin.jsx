import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useLiveQuizAdmin } from '../hooks/useLiveQuiz'
import { verifyAnswer, getGroqKeyCount } from '../utils/llmJudge'
import { supabase } from '../lib/supabase'

function generateSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 6)
}

export default function LiveQuizAdmin({ userId, isAdmin, profile, onClose }) {
  const { quizzes, loading, createQuiz, updateStatus, updateQuiz, deleteQuiz, getResponses, saveEvaluation, refetch } = useLiveQuizAdmin(userId)
  const [view, setView] = useState('list') // 'list' | 'create' | 'manage' | 'evaluate' | 'quizmasters'
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [evalProgress, setEvalProgress] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [quizmasters, setQuizmasters] = useState([])
  const [qmSearch, setQmSearch] = useState('')
  const [qmSearchResults, setQmSearchResults] = useState([])
  const [qmLoading, setQmLoading] = useState(false)
  const [viewResponses, setViewResponses] = useState(null) // { quiz, responses }

  // Live participant count for the selected quiz
  useEffect(() => {
    if (!selectedQuiz || view !== 'manage') { setParticipantCount(0); return }

    // Fetch initial count
    const fetchCount = async () => {
      const { count } = await supabase
        .from('live_quiz_responses')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', selectedQuiz.id)
      setParticipantCount(count || 0)
    }
    fetchCount()

    // Subscribe to new responses
    const channel = supabase
      .channel(`admin-responses-${selectedQuiz.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_quiz_responses',
        filter: `quiz_id=eq.${selectedQuiz.id}`,
      }, () => {
        setParticipantCount(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedQuiz?.id, view])

  // Create quiz form
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState([{ question: '', answer: '', points: 1 }])
  const [creating, setCreating] = useState(false)

  const addRow = () => setRows([...rows, { question: '', answer: '', points: 1 }])
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))
  const updateRow = (i, field, value) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [field]: field === 'points' ? (parseInt(value) || 1) : value }
    setRows(updated)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)

    const questions = rows.filter(r => r.question.trim() && r.answer.trim())

    if (questions.length === 0) {
      alert('Add at least one question with both question and answer filled.')
      setCreating(false)
      return
    }

    const slug = generateSlug(title)
    const { error } = await createQuiz(title, slug, questions)
    if (error) alert(error.message)
    else {
      setTitle('')
      setRows([{ question: '', answer: '', points: 1 }])
      setView('list')
    }
    setCreating(false)
  }

  const handleStatusChange = async (quiz, newStatus) => {
    if (newStatus === 'live' && !confirm('Make this quiz LIVE? Participants will be able to join.')) return
    if (newStatus === 'locked' && !confirm('LOCK this quiz? No more answer changes will be allowed.')) return
    await updateStatus(quiz.id, newStatus)
    setSelectedQuiz(prev => prev ? { ...prev, status: newStatus } : null)
  }

  const handleEvaluate = async (quiz) => {
    if (!confirm('Start evaluation? This will use AI to grade all responses and publish results.')) return
    const { data: responses } = await getResponses(quiz.id)
    if (!responses.length) { alert('No responses to evaluate'); return }

    const questions = quiz.questions
    let total = 0
    const totalToProcess = responses.length * questions.length
    const concurrency = Math.max(1, getGroqKeyCount()) // Parallel batches based on available keys
    setEvalProgress({ current: 0, total: totalToProcess, phase: `Evaluating (${concurrency} key${concurrency > 1 ? 's' : ''})...` })
    setView('evaluate')

    for (const resp of responses) {
      const scores = new Array(questions.length)
      let respTotal = 0

      // Separate into instant (no LLM) and needs-LLM
      const llmTasks = []
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const userAnswer = resp.answers?.find(a => a.question_index === i)?.answer || ''
        const trimmedAnswer = userAnswer.trim().toLowerCase()
        const trimmedCorrect = q.answer.trim().toLowerCase()

        let verdict = 'incorrect'
        let score = 0
        let needsLLM = false

        if (!trimmedAnswer) {
          verdict = 'incorrect'
        } else if (trimmedAnswer === trimmedCorrect) {
          verdict = 'correct'
          score = q.points
        } else if (trimmedCorrect.includes(trimmedAnswer) || trimmedAnswer.includes(trimmedCorrect)) {
          verdict = 'correct'
          score = q.points
        } else if (trimmedAnswer.replace(/[^a-z0-9]/g, '') === trimmedCorrect.replace(/[^a-z0-9]/g, '')) {
          verdict = 'correct'
          score = q.points
        } else {
          needsLLM = true
        }

        if (needsLLM) {
          llmTasks.push({ index: i, question: q.question, answer: q.answer, userAnswer, points: q.points })
        } else {
          scores[i] = { question_index: i, verdict, score }
          respTotal += score
          total++
        }
      }

      setEvalProgress({ current: total, total: totalToProcess, phase: `Evaluating (${concurrency} key${concurrency > 1 ? 's' : ''})...` })

      // Process LLM tasks in parallel batches
      for (let b = 0; b < llmTasks.length; b += concurrency) {
        const batch = llmTasks.slice(b, b + concurrency)
        const results = await Promise.allSettled(
          batch.map(async (task) => {
            const result = await verifyAnswer(task.question, task.answer, task.userAnswer)
            return { ...task, result }
          })
        )

        for (const res of results) {
          let verdict = 'error'
          let score = 0
          const task = res.status === 'fulfilled' ? res.value : batch[results.indexOf(res)]

          if (res.status === 'fulfilled') {
            verdict = res.value.result.verdict
            if (verdict === 'correct') score = res.value.result.points || task.points
            else if (verdict === 'partially_correct') score = Math.floor(task.points * 0.5)
          }

          scores[task.index] = { question_index: task.index, verdict, score }
          respTotal += score
          total++
        }

        setEvalProgress({ current: total, total: totalToProcess, phase: `Evaluating (${concurrency} key${concurrency > 1 ? 's' : ''})...` })
        // Small delay between batches to avoid rate limits
        if (b + concurrency < llmTasks.length) await new Promise(r => setTimeout(r, 150))
      }

      await saveEvaluation(resp.id, scores.filter(Boolean), respTotal)
    }

    // Mark quiz as results ready
    await updateStatus(quiz.id, 'results')
    setEvalProgress(null)
    setView('list')
    refetch()
  }

  const handleDelete = async (quiz) => {
    if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return
    await deleteQuiz(quiz.id)
  }

  const statusColors = {
    draft: 'text-gray-400 bg-gray-800',
    live: 'text-emerald-300 bg-emerald-900/40',
    locked: 'text-amber-300 bg-amber-900/40',
    evaluating: 'text-purple-300 bg-purple-900/40',
    results: 'text-cyan-300 bg-cyan-900/40',
  }

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <p className="text-cyan-400 text-sm animate-pulse font-orbitron">Loading...</p>
      </div>
    )
  }

  // Evaluation progress view
  if (view === 'evaluate' && evalProgress) {
    const pct = Math.round((evalProgress.current / evalProgress.total) * 100)
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="glass glow-border rounded-2xl p-8 max-w-md w-[90%] text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-white text-lg font-orbitron tracking-wider mb-4">Evaluating Answers</h2>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-gray-400 text-sm">{evalProgress.current} / {evalProgress.total} answers processed</p>
          <p className="text-gray-500 text-xs mt-2">This may take a few minutes for large quizzes</p>
        </div>
      </div>
    )
  }

  // Create quiz view
  if (view === 'create') {
    const validCount = rows.filter(r => r.question.trim() && r.answer.trim()).length
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-6 max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-sm font-orbitron tracking-wider">Create Live Quiz</h3>
            <button onClick={() => setView('list')} className="text-gray-400 hover:text-white text-sm cursor-pointer">← Back</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Quiz Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Friday Night Trivia"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Questions table */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Questions</label>
              
              {/* Header row */}
              <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem_2rem] gap-2 mb-2 px-1">
                <span className="text-gray-500 text-[10px]">#</span>
                <span className="text-gray-500 text-[10px]">Question</span>
                <span className="text-gray-500 text-[10px]">Answer</span>
                <span className="text-gray-500 text-[10px]">Pts</span>
                <span></span>
              </div>

              {/* Question rows */}
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[2rem_1fr_1fr_3.5rem_2rem] gap-2 items-center">
                    <span className="text-gray-500 text-xs text-center">{i + 1}</span>
                    <input
                      value={row.question}
                      onChange={e => updateRow(i, 'question', e.target.value)}
                      placeholder="Question"
                      className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      value={row.answer}
                      onChange={e => updateRow(i, 'answer', e.target.value)}
                      placeholder="Answer"
                      className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="1"
                      value={row.points}
                      onChange={e => updateRow(i, 'points', e.target.value)}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="text-red-400 hover:text-red-300 disabled:text-gray-700 text-lg cursor-pointer disabled:cursor-not-allowed text-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add row button */}
              <button
                onClick={addRow}
                className="mt-3 px-3 py-1.5 border border-dashed border-gray-600 hover:border-cyan-500 text-gray-400 hover:text-cyan-300 text-xs rounded-lg cursor-pointer transition-colors w-full"
              >
                + Add Question
              </button>

              <p className="text-gray-500 text-xs mt-2">{validCount} valid question{validCount !== 1 ? 's' : ''}</p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !title.trim() || validCount === 0}
              className="w-full px-4 py-2.5 bg-cyan-600/80 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : `Create Quiz (${validCount} questions)`}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Manage single quiz view
  if (view === 'manage' && selectedQuiz) {
    const quiz = quizzes.find(q => q.id === selectedQuiz.id) || selectedQuiz
    const joinUrl = `${window.location.origin}/live?code=${quiz.slug}`

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-6 max-w-lg w-[92%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-sm font-orbitron tracking-wider">{quiz.title}</h3>
            <button onClick={() => { setView('list'); setSelectedQuiz(null) }} className="text-gray-400 hover:text-white text-sm cursor-pointer">← Back</button>
          </div>

          {/* Status */}
          <div className="mb-4 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[quiz.status]}`}>
              {quiz.status.toUpperCase()}
            </span>
            <span className="text-gray-500 text-xs">{quiz.num_questions} questions</span>
            <span className="text-cyan-300 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {participantCount} joined
            </span>
          </div>

          {/* Join link */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">Share this link with participants:</p>
            <div className="flex items-center gap-2">
              <code className="text-cyan-300 text-xs flex-1 break-all">{joinUrl}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(joinUrl); alert('Copied!') }}
                className="text-xs px-2 py-1 bg-cyan-800/60 text-cyan-300 rounded cursor-pointer hover:bg-cyan-700"
              >
                Copy
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG value={joinUrl} size={140} />
              </div>
            </div>
          </div>

          {/* Action buttons based on status */}
          <div className="space-y-2 mb-4">
            {quiz.status === 'draft' && (
              <button
                onClick={() => handleStatusChange(quiz, 'live')}
                className="w-full px-4 py-2.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                🟢 Go Live
              </button>
            )}
            {quiz.status === 'live' && (
              <button
                onClick={() => handleStatusChange(quiz, 'locked')}
                className="w-full px-4 py-2.5 bg-amber-600/80 hover:bg-amber-500 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                🔒 Lock Answers
              </button>
            )}
            {quiz.status === 'locked' && (
              <button
                onClick={() => handleEvaluate(quiz)}
                className="w-full px-4 py-2.5 bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                ⚡ Evaluate All Answers
              </button>
            )}
            {quiz.status === 'results' && (
              <button
                onClick={() => window.open(`/live?code=${quiz.slug}`, '_blank')}
                className="w-full px-4 py-2.5 bg-cyan-600/80 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                📊 View Leaderboard
              </button>
            )}
            {quiz.status !== 'draft' && (
              <button
                onClick={async () => {
                  const { data } = await getResponses(quiz.id)
                  // Fetch profiles for display names
                  const userIds = (data || []).map(r => r.user_id)
                  let profileMap = {}
                  if (userIds.length > 0) {
                    const { data: profiles } = await supabase.from('profiles').select('id, display_name, username, email, avatar_emoji').in('id', userIds)
                    ;(profiles || []).forEach(p => { profileMap[p.id] = p })
                  }
                  const enriched = (data || []).map(r => ({ ...r, profile: profileMap[r.user_id] || null }))
                  setViewResponses({ quiz, responses: enriched })
                  setView('responses')
                }}
                className="w-full px-4 py-2.5 bg-gray-700/80 hover:bg-gray-600 text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                👁 View Responses ({participantCount})
              </button>
            )}
          </div>

          {/* Questions preview */}
          <div className="border-t border-gray-700/50 pt-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Questions</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {quiz.questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-gray-500 shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-white">{q.question}</p>
                    <p className="text-emerald-400/70">→ {q.answer} ({q.points} pts)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="mt-4 pt-4 border-t border-red-900/30">
            <button
              onClick={() => { handleDelete(quiz); setView('list'); setSelectedQuiz(null) }}
              className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
            >
              🗑 Delete this quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  const fetchQuizmasters = async () => {
    setQmLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, username, role')
      .eq('role', 'quizmaster')
    setQuizmasters(data || [])
    setQmLoading(false)
  }

  const searchUsers = async (query) => {
    if (!query.trim()) { setQmSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, username, role')
      .or(`email.ilike.%${query}%,username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('role', 'admin')
      .limit(10)
    setQmSearchResults(data || [])
  }

  const toggleQuizmaster = async (profileId, currentRole) => {
    const newRole = currentRole === 'quizmaster' ? 'user' : 'quizmaster'
    const action = newRole === 'quizmaster' ? 'grant quizmaster access to' : 'revoke quizmaster access from'
    if (!confirm(`Are you sure you want to ${action} this user?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    fetchQuizmasters()
    setQmSearchResults(prev => prev.map(u => u.id === profileId ? { ...u, role: newRole } : u))
  }

  // View responses panel
  if (view === 'responses' && viewResponses) {
    const { quiz: vQuiz, responses: vResponses } = viewResponses
    const [expandedResp, setExpandedResp] = useState(null)

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-6 max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white text-sm font-orbitron tracking-wider">Responses — {vQuiz.title}</h3>
              <p className="text-gray-500 text-xs">{vResponses.length} participant{vResponses.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setView('manage'); setViewResponses(null) }} className="text-gray-400 hover:text-white text-sm cursor-pointer">← Back</button>
          </div>

          {vResponses.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No responses yet.</p>
          ) : (
            <div className="space-y-3">
              {vResponses.map((resp) => (
                <div key={resp.id} className="bg-gray-800/30 rounded-lg overflow-hidden">
                  {/* Player header */}
                  <button
                    onClick={() => setExpandedResp(expandedResp === resp.id ? null : resp.id)}
                    className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{resp.profile?.avatar_emoji || '✦'}</span>
                      <div className="text-left">
                        <p className="text-white text-sm">{resp.profile?.display_name || resp.profile?.username || resp.profile?.email || 'Anonymous'}</p>
                        <p className="text-gray-500 text-[10px]">{resp.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {resp.evaluated && (
                        <span className="text-cyan-300 text-xs font-orbitron">{resp.total_score} pts</span>
                      )}
                      <span className="text-gray-500 text-xs">{resp.answers?.filter(a => a.answer?.trim()).length}/{vQuiz.questions.length} answered</span>
                      <span className="text-gray-500 text-xs">{expandedResp === resp.id ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded answers */}
                  {expandedResp === resp.id && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-700/30 pt-2">
                      {vQuiz.questions.map((q, i) => {
                        const ans = resp.answers?.find(a => a.question_index === i)
                        const score = resp.scores?.find(s => s.question_index === i)
                        const verdictColor = score?.verdict === 'correct' ? 'text-emerald-400' :
                          score?.verdict === 'partially_correct' ? 'text-amber-400' :
                          score ? 'text-red-400' : 'text-gray-500'

                        return (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-gray-500 shrink-0 w-5 text-right">{i + 1}.</span>
                            <div className="flex-1">
                              <p className="text-gray-400">{q.question}</p>
                              <p className="text-white mt-0.5">{ans?.answer || <span className="text-gray-600 italic">blank</span>}</p>
                            </div>
                            {score && (
                              <span className={`shrink-0 ${verdictColor}`}>{score.score}/{q.points}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Quizmaster management view (admin only)
  if (view === 'quizmasters' && isAdmin) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass glow-border rounded-2xl p-6 max-w-lg w-[92%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white text-sm font-orbitron tracking-wider">Manage Quizmasters</h3>
            <button onClick={() => setView('list')} className="text-gray-400 hover:text-white text-sm cursor-pointer">← Back</button>
          </div>

          {/* Search users */}
          <div className="mb-4">
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Search Users</label>
            <input
              value={qmSearch}
              onChange={e => { setQmSearch(e.target.value); searchUsers(e.target.value) }}
              placeholder="Search by email, username, or name..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Search results */}
          {qmSearchResults.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-gray-500 text-xs">Search results:</p>
              {qmSearchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{user.display_name || user.username || 'Unnamed'}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  <button
                    onClick={() => toggleQuizmaster(user.id, user.role)}
                    className={`px-3 py-1 text-xs rounded-lg cursor-pointer transition-colors ${
                      user.role === 'quizmaster'
                        ? 'bg-red-600/60 hover:bg-red-500 text-white'
                        : 'bg-emerald-600/60 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {user.role === 'quizmaster' ? 'Revoke' : 'Grant'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Current quizmasters */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current Quizmasters</p>
            {qmLoading ? (
              <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
            ) : quizmasters.length === 0 ? (
              <p className="text-gray-500 text-sm">No quizmasters assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {quizmasters.map(qm => (
                  <div key={qm.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-white text-sm">{qm.display_name || qm.username || 'Unnamed'}</p>
                      <p className="text-gray-500 text-xs">{qm.email}</p>
                    </div>
                    <button
                      onClick={() => toggleQuizmaster(qm.id, qm.role)}
                      className="px-3 py-1 text-xs bg-red-600/60 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="glass glow-border rounded-2xl p-6 max-w-lg w-[92%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙</span>
            <h3 className="text-white text-sm font-orbitron tracking-wider">Live Quiz Manager</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{profile?.avatar_emoji || '✦'} {profile?.display_name || profile?.email}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
          </div>
        </div>

        <button
          onClick={() => setView('create')}
          className="w-full mb-4 px-4 py-2.5 glass glow-border text-cyan-300 text-sm font-medium rounded-lg cursor-pointer hover:bg-cyan-900/20 flex items-center justify-center gap-2"
        >
          + Create New Live Quiz
        </button>

        {isAdmin && (
          <button
            onClick={() => { setView('quizmasters'); fetchQuizmasters() }}
            className="w-full mb-4 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            👥 Manage Quizmasters
          </button>
        )}

        {quizzes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No live quizzes yet. Create one to get started!</p>
        ) : (
          <div className="space-y-3">
            {quizzes.map(quiz => (
              <div
                key={quiz.id}
                onClick={() => { setSelectedQuiz(quiz); setView('manage') }}
                className="p-3 glass rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-medium">{quiz.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[quiz.status]}`}>
                    {quiz.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {quiz.num_questions} questions • {new Date(quiz.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
