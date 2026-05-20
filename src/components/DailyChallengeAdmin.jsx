import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { generateHints, classifyQuestion, isLLMConfigured } from '../utils/llmJudge'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function AdminMediaPreview({ imageUrl, mediaUrl }) {
  const ytId = getYouTubeId(mediaUrl)
  if (!imageUrl && !mediaUrl) return null
  return (
    <div className="space-y-2">
      {imageUrl && (
        <div className="rounded-lg overflow-hidden border border-cyan-500/20 max-w-xs">
          <img src={imageUrl} alt="Preview" className="w-full max-h-40 object-contain bg-black/30" />
        </div>
      )}
      {ytId && (
        <div className="rounded-lg overflow-hidden border border-gray-700/50 aspect-video max-w-xs">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
            title="Video preview"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {mediaUrl && !ytId && mediaUrl.match(/\.(mp3|wav|ogg|m4a)(\?|$)/i) && (
        <audio controls src={mediaUrl} className="w-full max-w-xs" />
      )}
      {mediaUrl && !ytId && mediaUrl.match(/\.(mp4|webm|ogv)(\?|$)/i) && (
        <div className="rounded-lg overflow-hidden border border-gray-700/50 max-w-xs">
          <video controls src={mediaUrl} className="w-full max-h-40" />
        </div>
      )}
    </div>
  )
}

// Get today's date in IST as YYYY-MM-DD
function getTodayIST() {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return ist.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DailyChallengeAdmin() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming') // 'upcoming' | 'past' | 'all'
  const [expanded, setExpanded] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newChallenge, setNewChallenge] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState(null)
  const [approvedQuestions, setApprovedQuestions] = useState([])
  const [showPicker, setShowPicker] = useState(false) // show question picker
  const [pickerTarget, setPickerTarget] = useState(null) // { challengeId: 'new'|id, index: number }
  const [pickerSearch, setPickerSearch] = useState('')
  const [hinting, setHinting] = useState(null) // 'new-0' | 'id-0' format for tracking
  const [classifying, setClassifying] = useState(null)

  const today = getTodayIST()

  const fetchChallenges = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .order('challenge_date', { ascending: true })

    if (error) {
      console.error('Fetch challenges error:', error.message)
    } else {
      setChallenges(data || [])
    }
    setLoading(false)
  }, [])

  const fetchApprovedQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('questions')
      .select('id, question, answer, difficulty, type, weights, hints, source')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setApprovedQuestions(data)
  }, [])

  useEffect(() => {
    fetchChallenges()
    fetchApprovedQuestions()
  }, [fetchChallenges, fetchApprovedQuestions])

  // Auto-merge expired challenges into the universe
  useEffect(() => {
    const mergeExpired = async () => {
      // Find past challenges not yet merged
      const unmerged = challenges.filter(c => c.challenge_date < today && !c.merged_to_universe)
      if (unmerged.length === 0) return

      for (const challenge of unmerged) {
        const questionsToInsert = challenge.questions.map((q, idx) => ({
          id: `daily-${challenge.challenge_date}-${idx}`,
          question: q.question,
          answer: q.answer,
          source: q.source || `Daily Challenge ${challenge.challenge_date}`,
          image_url: q.imageUrl || null,
          media_url: q.mediaUrl || null,
          difficulty: q.difficulty || 5,
          type: q.type || 'straight',
          weights: q.weights || {},
          hints: q.hints ? q.hints.map(h => h.text) : null,
          status: 'approved',
        }))

        // Insert questions (ignore conflicts with existing IDs)
        const { error: insertErr } = await supabase
          .from('questions')
          .upsert(questionsToInsert, { onConflict: 'id', ignoreDuplicates: true })

        if (insertErr) {
          console.error(`Failed to merge challenge ${challenge.challenge_date}:`, insertErr.message)
          continue
        }

        // Mark as merged
        await supabase
          .from('daily_challenges')
          .update({ merged_to_universe: true })
          .eq('id', challenge.id)
      }

      // Refresh challenges list
      fetchChallenges()
    }

    if (!loading && challenges.length > 0) {
      mergeExpired()
    }
  }, [loading, challenges.length]) // Only run once after initial load

  const filteredChallenges = challenges.filter(c => {
    if (filter === 'upcoming') return c.challenge_date >= today
    if (filter === 'past') return c.challenge_date < today
    return true
  })

  // New challenge template
  const initNewChallenge = () => {
    // Default to tomorrow
    const tomorrow = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000) + 86400000)
    const dateStr = tomorrow.toISOString().split('T')[0]
    setNewChallenge({
      challenge_date: dateStr,
      questions: [emptyQuestion()],
    })
    setCreating(true)
  }

  const emptyQuestion = () => ({
    question: '',
    answer: '',
    source: '',
    difficulty: 5,
    type: 'straight',
    weights: {},
    max_score: 5,
    hints: [{ text: '', cost: 1 }, { text: '', cost: 2 }, { text: '', cost: 3 }],
  })

  // AI generate hints for a question in the editor
  const handleAIHints = async (questions, setQuestions, challengeId, idx) => {
    const q = questions[idx]
    if (!q.question.trim() || !q.answer.trim()) return alert('Fill in question and answer first')
    const key = `${challengeId}-${idx}`
    setHinting(key)
    try {
      const hints = await generateHints(q.question, q.answer)
      // Convert string hints to {text, cost} format
      const formatted = hints.map((h, i) => ({
        text: typeof h === 'string' ? h : h.text || h,
        cost: i + 1,
      }))
      const qs = [...questions]
      qs[idx] = { ...qs[idx], hints: formatted }
      setQuestions(qs)
    } catch (err) {
      alert(`AI Hints failed: ${err.message}`)
    }
    setHinting(null)
  }

  // AI classify difficulty + domain weights for a question
  const handleAIClassify = async (questions, setQuestions, challengeId, idx) => {
    const q = questions[idx]
    if (!q.question.trim() || !q.answer.trim()) return alert('Fill in question and answer first')
    const key = `${challengeId}-${idx}`
    setClassifying(key)
    try {
      const result = await classifyQuestion(q.question, q.answer)
      const qs = [...questions]
      qs[idx] = { ...qs[idx], difficulty: result.difficulty, max_score: result.difficulty, weights: result.weights }
      setQuestions(qs)
    } catch (err) {
      alert(`AI Classify failed: ${err.message}`)
    }
    setClassifying(null)
  }

  // Save new challenge
  const handleCreate = async () => {
    if (!newChallenge.challenge_date) return alert('Please select a date')
    const validQs = newChallenge.questions.filter(q => q.question.trim() && q.answer.trim())
    if (validQs.length === 0) return alert('Add at least one question with question and answer text')

    // Clean up hints - remove empty ones, enforce max_score = difficulty
    const cleanedQs = validQs.map(q => ({
      ...q,
      max_score: q.difficulty,
      hints: (q.hints || []).filter(h => h.text.trim()),
    }))

    setSaving(true)
    const { error } = await supabase.from('daily_challenges').insert({
      challenge_date: newChallenge.challenge_date,
      questions: cleanedQs,
    })

    if (error) {
      if (error.code === '23505') {
        alert('A challenge already exists for this date!')
      } else {
        alert(`Save failed: ${error.message}`)
      }
    } else {
      setCreating(false)
      setNewChallenge(null)
      fetchChallenges()
    }
    setSaving(false)
  }

  // Edit existing challenge
  const startEditing = (challenge) => {
    setEditingId(challenge.id)
    setEditData({
      challenge_date: challenge.challenge_date,
      questions: challenge.questions.map(q => ({
        ...q,
        hints: q.hints && q.hints.length > 0 ? q.hints : [{ text: '', cost: 1 }, { text: '', cost: 2 }, { text: '', cost: 3 }],
      })),
    })
  }

  const handleSaveEdit = async () => {
    if (!editData) return
    const validQs = editData.questions.filter(q => q.question.trim() && q.answer.trim())
    if (validQs.length === 0) return alert('Need at least one valid question')

    const cleanedQs = validQs.map(q => ({
      ...q,
      max_score: q.difficulty,
      hints: (q.hints || []).filter(h => h.text.trim()),
    }))

    setSaving(true)
    const { error } = await supabase
      .from('daily_challenges')
      .update({
        challenge_date: editData.challenge_date,
        questions: cleanedQs,
      })
      .eq('id', editingId)

    if (error) {
      alert(`Update failed: ${error.message}`)
    } else {
      setEditingId(null)
      setEditData(null)
      fetchChallenges()
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this daily challenge? This cannot be undone.')) return
    const { error } = await supabase.from('daily_challenges').delete().eq('id', id)
    if (error) alert(`Delete failed: ${error.message}`)
    else setChallenges(prev => prev.filter(c => c.id !== id))
  }

  // Question picker - import from approved questions
  const openPicker = (targetId, index) => {
    setPickerTarget({ challengeId: targetId, index })
    setPickerSearch('')
    setShowPicker(true)
  }

  const handlePickQuestion = (q) => {
    const imported = {
      question: q.question,
      answer: q.answer,
      source: q.source || '',
      difficulty: q.difficulty || 5,
      type: q.type || 'straight',
      weights: q.weights || {},
      max_score: q.difficulty || 5,
      hints: q.hints && Array.isArray(q.hints)
        ? q.hints.map((h, i) => typeof h === 'string' ? { text: h, cost: i + 1 } : h)
        : [{ text: '', cost: 1 }, { text: '', cost: 2 }, { text: '', cost: 3 }],
    }

    if (pickerTarget.challengeId === 'new') {
      setNewChallenge(prev => {
        const qs = [...prev.questions]
        qs[pickerTarget.index] = imported
        return { ...prev, questions: qs }
      })
    } else {
      setEditData(prev => {
        const qs = [...prev.questions]
        qs[pickerTarget.index] = imported
        return { ...prev, questions: qs }
      })
    }
    setShowPicker(false)
  }

  const filteredPicker = approvedQuestions.filter(q =>
    !pickerSearch ||
    q.question.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    q.answer.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  // Render question editor row
  const renderQuestionEditor = (questions, setQuestions, challengeId) => (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-cyan-400 text-xs font-medium">Q{idx + 1}</span>
            <div className="flex gap-2">
              <button
                onClick={() => openPicker(challengeId, idx)}
                className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                📥 Import from Universe
              </button>
              {questions.length > 1 && (
                <button
                  onClick={() => {
                    const qs = questions.filter((_, i) => i !== idx)
                    setQuestions(qs)
                  }}
                  className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                >
                  ✕ Remove
                </button>
              )}
            </div>
          </div>

          {/* Question & Answer */}
          <textarea
            value={q.question}
            onChange={(e) => {
              const qs = [...questions]
              qs[idx] = { ...qs[idx], question: e.target.value }
              setQuestions(qs)
            }}
            placeholder="Question text..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
            rows={2}
          />
          <textarea
            value={q.answer}
            onChange={(e) => {
              const qs = [...questions]
              qs[idx] = { ...qs[idx], answer: e.target.value }
              setQuestions(qs)
            }}
            placeholder="Answer..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
            rows={1}
          />

          {/* Image & Media URL */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="text-gray-500 text-xs">Image URL</label>
              <input
                type="text" value={q.imageUrl || ''}
                onChange={(e) => {
                  const qs = [...questions]
                  qs[idx] = { ...qs[idx], imageUrl: e.target.value }
                  setQuestions(qs)
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 block"
                placeholder="https://..."
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-gray-500 text-xs">Media URL (YouTube, audio, video)</label>
              <input
                type="text" value={q.mediaUrl || ''}
                onChange={(e) => {
                  const qs = [...questions]
                  qs[idx] = { ...qs[idx], mediaUrl: e.target.value }
                  setQuestions(qs)
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-cyan-500/50 block"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>

          {/* Image/Media preview */}
          <AdminMediaPreview imageUrl={q.imageUrl} mediaUrl={q.mediaUrl} />

          {/* Row: difficulty, type, source + AI classify */}
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-gray-500 text-xs">Difficulty / Max Score ({q.difficulty} pts)</label>
              <input
                type="range" min={1} max={10} value={q.difficulty}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  const qs = [...questions]
                  qs[idx] = { ...qs[idx], difficulty: val, max_score: val }
                  setQuestions(qs)
                }}
                className="w-24 block"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs">Type</label>
              <select
                value={q.type}
                onChange={(e) => {
                  const qs = [...questions]
                  qs[idx] = { ...qs[idx], type: e.target.value }
                  setQuestions(qs)
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs block"
              >
                {Object.entries(QUESTION_TYPES).map(([key, { label, icon }]) => (
                  <option key={key} value={key}>{icon} {label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs">Source</label>
              <input
                type="text" value={q.source || ''}
                onChange={(e) => {
                  const qs = [...questions]
                  qs[idx] = { ...qs[idx], source: e.target.value }
                  setQuestions(qs)
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs w-32 block"
                placeholder="Source..."
              />
            </div>
            {isLLMConfigured() && (
              <button
                onClick={() => handleAIClassify(questions, setQuestions, challengeId, idx)}
                disabled={classifying === `${challengeId}-${idx}` || !q.question.trim() || !q.answer.trim()}
                className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded cursor-pointer transition-colors"
              >
                {classifying === `${challengeId}-${idx}` ? '🔄 Classifying...' : '🤖 AI Classify'}
              </button>
            )}
          </div>

          {/* Hints with costs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 text-xs">Hints (with point cost)</label>
              {isLLMConfigured() && (
                <button
                  onClick={() => handleAIHints(questions, setQuestions, challengeId, idx)}
                  disabled={hinting === `${challengeId}-${idx}` || !q.question.trim() || !q.answer.trim()}
                  className="text-xs px-2 py-0.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white rounded cursor-pointer transition-colors"
                >
                  {hinting === `${challengeId}-${idx}` ? '🔄 Generating...' : '💡 AI Hints'}
                </button>
              )}
            </div>
            <div className="space-y-1">
              {(q.hints || []).map((hint, hIdx) => (
                <div key={hIdx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={hint.text}
                    onChange={(e) => {
                      const qs = [...questions]
                      const hints = [...(qs[idx].hints || [])]
                      hints[hIdx] = { ...hints[hIdx], text: e.target.value }
                      qs[idx] = { ...qs[idx], hints }
                      setQuestions(qs)
                    }}
                    placeholder={`Hint ${hIdx + 1}...`}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-xs">-</span>
                    <input
                      type="number" min={1} max={10}
                      value={hint.cost}
                      onChange={(e) => {
                        const qs = [...questions]
                        const hints = [...(qs[idx].hints || [])]
                        hints[hIdx] = { ...hints[hIdx], cost: Number(e.target.value) }
                        qs[idx] = { ...qs[idx], hints }
                        setQuestions(qs)
                      }}
                      className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-amber-300 text-xs w-10 text-center"
                    />
                    <span className="text-gray-500 text-xs">pts</span>
                  </div>
                  <button
                    onClick={() => {
                      const qs = [...questions]
                      const hints = (qs[idx].hints || []).filter((_, i) => i !== hIdx)
                      qs[idx] = { ...qs[idx], hints }
                      setQuestions(qs)
                    }}
                    className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const qs = [...questions]
                  const hints = [...(qs[idx].hints || [])]
                  hints.push({ text: '', cost: hints.length + 1 })
                  qs[idx] = { ...qs[idx], hints }
                  setQuestions(qs)
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer mt-1"
              >
                + Add hint
              </button>
            </div>
          </div>

          {/* Domain weights (compact) */}
          <details className="group">
            <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">
              Domain Weights {Object.values(q.weights || {}).some(v => v > 0) && '✓'}
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2">
              {DOMAIN_KEYS.map(key => (
                <div key={key} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAINS[key]?.color }} />
                  <span className="text-gray-400 text-xs w-16 truncate">{DOMAINS[key]?.label}</span>
                  <input
                    type="range" min={0} max={10}
                    value={(q.weights || {})[key] || 0}
                    onChange={(e) => {
                      const qs = [...questions]
                      qs[idx] = { ...qs[idx], weights: { ...(qs[idx].weights || {}), [key]: Number(e.target.value) } }
                      setQuestions(qs)
                    }}
                    className="w-14 h-1"
                  />
                  <span className="text-gray-500 text-xs w-3">{(q.weights || {})[key] || 0}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      ))}

      {/* Add question button */}
      {questions.length < 7 && (
        <button
          onClick={() => setQuestions([...questions, emptyQuestion()])}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50 text-sm cursor-pointer transition-colors"
        >
          + Add Question
        </button>
      )}
    </div>
  )

  // Question picker modal
  const renderPicker = () => {
    if (!showPicker) return null
    return (
      <div className="absolute inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
        <div className="glass glow-border rounded-xl p-4 max-w-lg w-full max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white text-sm font-medium">Import from Universe</h4>
            <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-white cursor-pointer">&times;</button>
          </div>
          <input
            type="text"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-cyan-500/50"
          />
          <div className="overflow-y-auto flex-1 space-y-2">
            {filteredPicker.slice(0, 50).map(q => (
              <div
                key={q.id}
                onClick={() => handlePickQuestion(q)}
                className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-cyan-500/50 transition-colors"
              >
                <p className="text-white text-sm mb-1">{q.question}</p>
                <p className="text-gray-400 text-xs">{q.answer}</p>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-gray-500">Diff: {q.difficulty}</span>
                  {q.type && QUESTION_TYPES[q.type] && (
                    <span className="text-gray-500">{QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}</span>
                  )}
                </div>
              </div>
            ))}
            {filteredPicker.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No questions found</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="text-cyan-400 text-sm animate-pulse py-8 text-center">Loading daily challenges...</p>
  }

  return (
    <div className="relative">
      {/* Header / Actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1">
          {['upcoming', 'past', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg cursor-pointer transition-colors ${
                filter === f ? 'glass text-cyan-300 ring-1 ring-cyan-500/50' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'upcoming' ? '📅 Upcoming' : f === 'past' ? '📜 Past' : '🌐 All'}
            </button>
          ))}
        </div>
        {!creating && (
          <button
            onClick={initNewChallenge}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg cursor-pointer transition-colors"
          >
            + New Challenge
          </button>
        )}
      </div>

      {/* Create new challenge form */}
      {creating && newChallenge && (
        <div className="bg-gray-800/80 border border-emerald-700/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-emerald-300 text-sm font-medium">New Daily Challenge</h3>
            <button onClick={() => { setCreating(false); setNewChallenge(null) }} className="text-gray-400 hover:text-white text-xs cursor-pointer">Cancel</button>
          </div>

          {/* Date picker */}
          <div className="mb-4">
            <label className="text-gray-400 text-xs block mb-1">Challenge Date</label>
            <input
              type="date"
              value={newChallenge.challenge_date}
              min={today}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, challenge_date: e.target.value }))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Questions editor */}
          {renderQuestionEditor(
            newChallenge.questions,
            (qs) => setNewChallenge(prev => ({ ...prev, questions: qs })),
            'new'
          )}

          {/* Save button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg cursor-pointer transition-colors"
            >
              {saving ? 'Saving...' : `✓ Schedule (${newChallenge.questions.filter(q => q.question.trim()).length} questions)`}
            </button>
          </div>
        </div>
      )}

      {/* Challenges list */}
      {filteredChallenges.length === 0 && !creating ? (
        <p className="text-gray-500 text-sm py-8 text-center">
          {filter === 'upcoming' ? 'No upcoming challenges scheduled.' : filter === 'past' ? 'No past challenges.' : 'No challenges found.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredChallenges.map(c => {
            const isExpanded = expanded === c.id
            const isEditing = editingId === c.id
            const isPast = c.challenge_date < today
            const isToday = c.challenge_date === today

            return (
              <div
                key={c.id}
                className={`border rounded-xl p-4 transition-colors ${
                  isToday ? 'bg-cyan-900/20 border-cyan-500/40' :
                  isPast ? 'bg-gray-800/40 border-gray-700/30' :
                  'bg-gray-800/70 border-gray-700/50'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                    <span className={`text-sm font-medium ${isToday ? 'text-cyan-300' : isPast ? 'text-gray-500' : 'text-white'}`}>
                      {formatDate(c.challenge_date)}
                    </span>
                    {isToday && <span className="text-xs bg-cyan-600/30 text-cyan-300 px-2 py-0.5 rounded">TODAY</span>}
                    {!isPast && !isToday && <span className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded">Scheduled</span>}
                    <span className="text-gray-500 text-xs">{c.questions.length} Q{c.questions.length !== 1 ? 's' : ''}</span>
                    <span className="text-gray-600 text-xs">
                      Max: {c.questions.reduce((sum, q) => sum + (q.max_score || 10), 0)} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="text-gray-400 hover:text-cyan-400 text-xs cursor-pointer"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    {!isPast && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-gray-500 hover:text-red-400 text-xs cursor-pointer"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded view */}
                {isExpanded && !isEditing && (
                  <div className="mt-3 border-t border-gray-700/50 pt-3 space-y-3">
                    {c.questions.map((q, idx) => (
                      <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-white text-sm mb-1"><span className="text-cyan-400 text-xs mr-2">Q{idx + 1}</span>{q.question}</p>
                            <p className="text-gray-400 text-xs">A: {q.answer}</p>
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">{q.max_score || 10} pts</span>
                        </div>
                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="text-gray-500">Diff: {q.difficulty}/10</span>
                          {q.type && QUESTION_TYPES[q.type] && (
                            <span className="text-gray-500">{QUESTION_TYPES[q.type].icon} {QUESTION_TYPES[q.type].label}</span>
                          )}
                          {q.source && <span className="text-gray-600">📖 {q.source}</span>}
                        </div>
                        {/* Hints */}
                        {q.hints && q.hints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.hints.map((h, hIdx) => (
                              <span key={hIdx} className="text-xs bg-amber-900/30 text-amber-300/80 px-2 py-0.5 rounded">
                                💡 {h.text} <span className="text-amber-500">(-{h.cost})</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Image/Media preview */}
                        <AdminMediaPreview imageUrl={q.imageUrl} mediaUrl={q.mediaUrl} />
                      </div>
                    ))}

                    {/* Edit button */}
                    {!isPast && (
                      <button
                        onClick={() => startEditing(c)}
                        className="px-3 py-1.5 glass glow-border text-cyan-300 text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        ✎ Edit Challenge
                      </button>
                    )}
                  </div>
                )}

                {/* Edit mode */}
                {isExpanded && isEditing && editData && (
                  <div className="mt-3 border-t border-gray-700/50 pt-3">
                    <div className="mb-3">
                      <label className="text-gray-400 text-xs block mb-1">Challenge Date</label>
                      <input
                        type="date"
                        value={editData.challenge_date}
                        onChange={(e) => setEditData(prev => ({ ...prev, challenge_date: e.target.value }))}
                        className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>

                    {renderQuestionEditor(
                      editData.questions,
                      (qs) => setEditData(prev => ({ ...prev, questions: qs })),
                      editingId
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        {saving ? 'Saving...' : '✓ Save Changes'}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditData(null) }}
                        className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg cursor-pointer transition-colors"
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

      {/* Question picker modal */}
      {renderPicker()}
    </div>
  )
}
