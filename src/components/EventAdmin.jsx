import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES from '../utils/questionTypes'
import { generateHints, classifyQuestion, isLLMConfigured } from '../utils/llmJudge'

const BASE_URL = 'https://quiziverse-tau.vercel.app'

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

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
        <div className="rounded-lg overflow-hidden border border-amber-500/20 max-w-xs">
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

const emptyQuestion = () => ({
  question: '',
  answer: '',
  source: '',
  difficulty: 5,
  type: 'straight',
  weights: {},
  max_score: 5,
  hints: [{ text: '', cost: 1 }, { text: '', cost: 2 }, { text: '', cost: 3 }],
  imageUrl: '',
  mediaUrl: '',
  answerImageUrl: '',
  answerMediaUrl: '',
  answerExplanation: '',
})

export default function EventAdmin({ onClose }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showQR, setShowQR] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hinting, setHinting] = useState(null)
  const [classifying, setClassifying] = useState(null)

  // Create form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  // Editing questions for selected event
  const [editQuestions, setEditQuestions] = useState([])

  const fetchEvents = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // When selecting an event, load its questions into the editor
  useEffect(() => {
    if (selectedEvent) {
      const qs = (selectedEvent.questions || []).map(q => ({
        ...emptyQuestion(),
        ...q,
        hints: q.hints && q.hints.length > 0 ? q.hints : [{ text: '', cost: 1 }, { text: '', cost: 2 }, { text: '', cost: 3 }],
      }))
      setEditQuestions(qs.length > 0 ? qs : [emptyQuestion()])
    }
  }, [selectedEvent?.id])

  const handleCreateEvent = async () => {
    if (!title.trim()) return
    const eventSlug = slug.trim() || slugify(title)

    const { data, error } = await supabase
      .from('events')
      .insert({
        title: title.trim(),
        slug: eventSlug,
        description: description.trim() || null,
        questions: [],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      alert('Error creating event: ' + error.message)
      return
    }

    setEvents(prev => [data, ...prev])
    setShowCreate(false)
    setSelectedEvent(data)
    setTitle('')
    setSlug('')
    setDescription('')
  }

  // Save questions to database
  const handleSaveQuestions = async () => {
    if (!selectedEvent) return
    const validQs = editQuestions.filter(q => q.question.trim() && q.answer.trim())
    if (validQs.length === 0) return alert('Add at least one question with question and answer text')

    const cleanedQs = validQs.map(q => ({
      ...q,
      max_score: q.difficulty,
      hints: (q.hints || []).filter(h => h.text.trim()),
    }))

    setSaving(true)
    const { error } = await supabase
      .from('events')
      .update({ questions: cleanedQs })
      .eq('id', selectedEvent.id)

    if (error) {
      alert('Save failed: ' + error.message)
    } else {
      const updated = { ...selectedEvent, questions: cleanedQs }
      setSelectedEvent(updated)
      setEvents(prev => prev.map(e => e.id === selectedEvent.id ? updated : e))
    }
    setSaving(false)
  }

  // AI generate hints
  const handleAIHints = async (idx) => {
    const q = editQuestions[idx]
    if (!q.question.trim() || !q.answer.trim()) return alert('Fill in question and answer first')
    setHinting(idx)
    try {
      const hints = await generateHints(q.question, q.answer)
      const formatted = hints.map((h, i) => ({
        text: typeof h === 'string' ? h : h.text || h,
        cost: i + 1,
      }))
      const qs = [...editQuestions]
      qs[idx] = { ...qs[idx], hints: formatted }
      setEditQuestions(qs)
    } catch (err) {
      alert(`AI Hints failed: ${err.message}`)
    }
    setHinting(null)
  }

  // AI classify
  const handleAIClassify = async (idx) => {
    const q = editQuestions[idx]
    if (!q.question.trim() || !q.answer.trim()) return alert('Fill in question and answer first')
    setClassifying(idx)
    try {
      const result = await classifyQuestion(q.question, q.answer)
      const qs = [...editQuestions]
      qs[idx] = { ...qs[idx], difficulty: result.difficulty, max_score: result.difficulty, weights: result.weights }
      setEditQuestions(qs)
    } catch (err) {
      alert(`AI Classify failed: ${err.message}`)
    }
    setClassifying(null)
  }

  const handleToggleActive = async (eventId, currentState) => {
    const { error } = await supabase
      .from('events')
      .update({ is_active: !currentState })
      .eq('id', eventId)
    if (error) return
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_active: !currentState } : e))
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(prev => ({ ...prev, is_active: !currentState }))
    }
  }

  // Delete event permanently
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Delete this event permanently? All attempts will also be deleted. This cannot be undone.')) return
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      alert('Delete failed: ' + error.message)
      return
    }
    setEvents(prev => prev.filter(e => e.id !== eventId))
    if (selectedEvent?.id === eventId) setSelectedEvent(null)
  }

  // Close event & merge questions into the universe
  const handleCloseEvent = async (ev) => {
    if (!confirm(`Close "${ev.title}" and transfer all ${(ev.questions || []).length} questions to the Quiziverse universe?`)) return

    const questions = ev.questions || []
    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, idx) => ({
        id: `event-${ev.slug}-${idx}`,
        question: q.question,
        answer: q.answer,
        source: q.source || `Event: ${ev.title}`,
        image_url: q.imageUrl || null,
        media_url: q.mediaUrl || null,
        answer_image_url: q.answerImageUrl || null,
        answer_media_url: q.answerMediaUrl || null,
        answer_explanation: q.answerExplanation || null,
        difficulty: q.difficulty || 5,
        type: q.type || 'straight',
        weights: q.weights || {},
        hints: q.hints ? q.hints.map(h => h.text) : null,
        status: 'approved',
      }))

      const { error: insertErr } = await supabase
        .from('questions')
        .upsert(questionsToInsert, { onConflict: 'id', ignoreDuplicates: true })

      if (insertErr) {
        alert('Failed to transfer questions: ' + insertErr.message)
        return
      }
    }

    // Deactivate the event
    const { error } = await supabase
      .from('events')
      .update({ is_active: false })
      .eq('id', ev.id)

    if (error) {
      alert('Failed to close event: ' + error.message)
      return
    }

    alert(`✓ Event closed! ${questions.length} questions transferred to the universe.`)
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_active: false } : e))
    if (selectedEvent?.id === ev.id) {
      setSelectedEvent(prev => ({ ...prev, is_active: false }))
    }
  }

  // QR Code modal
  if (showQR) {
    const eventUrl = `${BASE_URL}?event=${showQR.slug}`
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setShowQR(null)}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-[90%] text-center" onClick={e => e.stopPropagation()}>
          <h3 className="text-gray-900 text-lg font-bold mb-2">{showQR.title}</h3>
          <p className="text-gray-500 text-xs mb-4">Scan to join the event quiz</p>
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={eventUrl} size={220} level="H" includeMargin />
          </div>
          <p className="text-gray-600 text-xs break-all mb-4">{eventUrl}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigator.clipboard.writeText(eventUrl).then(() => alert('Link copied!'))}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg cursor-pointer hover:bg-gray-700"
            >
              📋 Copy Link
            </button>
            <button
              onClick={() => setShowQR(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Event detail/edit view with full question editor
  if (selectedEvent) {
    const eventUrl = `${BASE_URL}?event=${selectedEvent.slug}`
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
        <div className="glass rounded-2xl p-6 max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto border border-amber-500/30" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer mb-1">← Back to events</button>
              <h2 className="text-white text-lg font-orbitron">{selectedEvent.title}</h2>
              <p className="text-gray-500 text-xs">/{selectedEvent.slug} • {editQuestions.filter(q => q.question.trim()).length} questions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQR(selectedEvent)}
                className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-lg cursor-pointer hover:bg-gray-200"
              >
                QR Code
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
            </div>
          </div>

          {/* Event URL */}
          <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-gray-400 text-xs flex-1 break-all">{eventUrl}</span>
            <button
              onClick={() => navigator.clipboard.writeText(eventUrl)}
              className="text-amber-400 text-xs cursor-pointer hover:text-amber-300 shrink-0"
            >
              Copy
            </button>
          </div>

          {/* Full question editor - same as DailyChallengeAdmin */}
          <div className="space-y-4">
            {editQuestions.map((q, idx) => (
              <div key={idx} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 text-xs font-medium">Q{idx + 1}</span>
                  <div className="flex gap-2">
                    {editQuestions.length > 1 && (
                      <button
                        onClick={() => setEditQuestions(editQuestions.filter((_, i) => i !== idx))}
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
                    const qs = [...editQuestions]
                    qs[idx] = { ...qs[idx], question: e.target.value }
                    setEditQuestions(qs)
                  }}
                  placeholder="Question text..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                  rows={2}
                />
                <textarea
                  value={q.answer}
                  onChange={(e) => {
                    const qs = [...editQuestions]
                    qs[idx] = { ...qs[idx], answer: e.target.value }
                    setEditQuestions(qs)
                  }}
                  placeholder="Answer..."
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
                  rows={1}
                />

                {/* Image & Media URL */}
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-gray-500 text-xs">Image URL</label>
                    <input
                      type="text" value={q.imageUrl || ''}
                      onChange={(e) => {
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], imageUrl: e.target.value }
                        setEditQuestions(qs)
                      }}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50 block"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-gray-500 text-xs">Media URL (YouTube, audio, video)</label>
                    <input
                      type="text" value={q.mediaUrl || ''}
                      onChange={(e) => {
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], mediaUrl: e.target.value }
                        setEditQuestions(qs)
                      }}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50 block"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
                <AdminMediaPreview imageUrl={q.imageUrl} mediaUrl={q.mediaUrl} />

                {/* Answer Image & Media URL */}
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-gray-500 text-xs">Answer Image URL</label>
                    <input
                      type="text" value={q.answerImageUrl || ''}
                      onChange={(e) => {
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], answerImageUrl: e.target.value }
                        setEditQuestions(qs)
                      }}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50 block"
                      placeholder="https://... (shown on answer reveal)"
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-gray-500 text-xs">Answer Media URL</label>
                    <input
                      type="text" value={q.answerMediaUrl || ''}
                      onChange={(e) => {
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], answerMediaUrl: e.target.value }
                        setEditQuestions(qs)
                      }}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50 block"
                      placeholder="https://youtube.com/... (shown on answer reveal)"
                    />
                  </div>
                </div>
                <AdminMediaPreview imageUrl={q.answerImageUrl} mediaUrl={q.answerMediaUrl} />

                {/* Answer Explanation */}
                <div>
                  <label className="text-gray-500 text-xs">Answer Explanation</label>
                  <textarea
                    value={q.answerExplanation || ''}
                    onChange={(e) => {
                      const qs = [...editQuestions]
                      qs[idx] = { ...qs[idx], answerExplanation: e.target.value }
                      setEditQuestions(qs)
                    }}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500/50 block resize-none"
                    placeholder="Explanation shown after answer reveal..."
                  />
                </div>

                {/* Row: difficulty, type, source + AI classify */}
                <div className="flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="text-gray-500 text-xs">Difficulty / Max Score ({q.difficulty} pts)</label>
                    <input
                      type="range" min={1} max={10} value={q.difficulty}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], difficulty: val, max_score: val }
                        setEditQuestions(qs)
                      }}
                      className="w-24 block"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs">Type</label>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], type: e.target.value }
                        setEditQuestions(qs)
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
                        const qs = [...editQuestions]
                        qs[idx] = { ...qs[idx], source: e.target.value }
                        setEditQuestions(qs)
                      }}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs w-32 block"
                      placeholder="Source..."
                    />
                  </div>
                  {isLLMConfigured() && (
                    <button
                      onClick={() => handleAIClassify(idx)}
                      disabled={classifying === idx || !q.question.trim() || !q.answer.trim()}
                      className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded cursor-pointer transition-colors"
                    >
                      {classifying === idx ? '🔄 Classifying...' : '🤖 AI Classify'}
                    </button>
                  )}
                </div>

                {/* Hints with costs */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-500 text-xs">Hints (with point cost)</label>
                    {isLLMConfigured() && (
                      <button
                        onClick={() => handleAIHints(idx)}
                        disabled={hinting === idx || !q.question.trim() || !q.answer.trim()}
                        className="text-xs px-2 py-0.5 bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white rounded cursor-pointer transition-colors"
                      >
                        {hinting === idx ? '🔄 Generating...' : '💡 AI Hints'}
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
                            const qs = [...editQuestions]
                            const hints = [...(qs[idx].hints || [])]
                            hints[hIdx] = { ...hints[hIdx], text: e.target.value }
                            qs[idx] = { ...qs[idx], hints }
                            setEditQuestions(qs)
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
                              const qs = [...editQuestions]
                              const hints = [...(qs[idx].hints || [])]
                              hints[hIdx] = { ...hints[hIdx], cost: Number(e.target.value) }
                              qs[idx] = { ...qs[idx], hints }
                              setEditQuestions(qs)
                            }}
                            className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-amber-300 text-xs w-10 text-center"
                          />
                          <span className="text-gray-500 text-xs">pts</span>
                        </div>
                        <button
                          onClick={() => {
                            const qs = [...editQuestions]
                            const hints = (qs[idx].hints || []).filter((_, i) => i !== hIdx)
                            qs[idx] = { ...qs[idx], hints }
                            setEditQuestions(qs)
                          }}
                          className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
                        >✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const qs = [...editQuestions]
                        const hints = [...(qs[idx].hints || [])]
                        hints.push({ text: '', cost: hints.length + 1 })
                        qs[idx] = { ...qs[idx], hints }
                        setEditQuestions(qs)
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer mt-1"
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
                            const qs = [...editQuestions]
                            qs[idx] = { ...qs[idx], weights: { ...(qs[idx].weights || {}), [key]: Number(e.target.value) } }
                            setEditQuestions(qs)
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
            <button
              onClick={() => setEditQuestions([...editQuestions, emptyQuestion()])}
              className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-amber-300 hover:border-amber-500/50 text-sm cursor-pointer transition-colors"
            >
              + Add Question
            </button>
          </div>

          {/* Save button */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSaveQuestions}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : '💾 Save All Questions'}
            </button>
          </div>

          {/* Close Event & Delete */}
          <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-3">
            <button
              onClick={() => handleCloseEvent(selectedEvent)}
              className="flex-1 px-4 py-2 bg-purple-600/80 hover:bg-purple-500 text-white text-sm rounded-lg cursor-pointer transition-colors"
            >
              🏁 Close Event & Transfer to Universe
            </button>
            <button
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded-lg cursor-pointer transition-colors"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Events list view
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="glass rounded-2xl p-6 max-w-lg w-[92%] max-h-[80vh] overflow-y-auto border border-amber-500/30" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-orbitron">🎯 Event Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
        </div>

        {/* Create new event */}
        {showCreate ? (
          <div className="border border-amber-500/30 rounded-lg p-4 mb-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); if (!slug) setSlug('') }}
              placeholder="Event title (e.g. Zerodha Varsity Grand Finale 2026)"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={`Slug (auto: ${slugify(title || 'event-name')})`}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (shown to players before they start)..."
              rows={2}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateEvent}
                disabled={!title.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white text-sm rounded-lg cursor-pointer disabled:cursor-not-allowed"
              >
                Create Event
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg cursor-pointer hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full px-4 py-2.5 border border-dashed border-amber-500/40 text-amber-300 text-sm rounded-lg cursor-pointer hover:bg-amber-900/20 mb-4"
          >
            + Create New Event
          </button>
        )}

        {/* Events list */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-4">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No events yet. Create your first one!</p>
        ) : (
          <div className="space-y-2">
            {events.map(ev => (
              <div
                key={ev.id}
                className="bg-gray-800/40 rounded-lg px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-700/40 transition-colors"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <p className="text-white text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-gray-500 text-xs">/{ev.slug} • {(ev.questions || []).length} Qs</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowQR(ev)}
                    className="text-gray-400 hover:text-white text-xs cursor-pointer"
                    title="Show QR"
                  >
                    📱
                  </button>
                  <button
                    onClick={() => handleToggleActive(ev.id, ev.is_active)}
                    className={`text-xs px-2 py-1 rounded cursor-pointer ${ev.is_active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}
                  >
                    {ev.is_active ? 'Active' : 'Inactive'}
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
