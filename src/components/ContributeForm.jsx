import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'

const emptyWeights = () =>
  Object.fromEntries(DOMAIN_KEYS.map(d => [d, 1]))

function ContributeForm({ onClose, onSubmitted }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [source, setSource] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [weights, setWeights] = useState(emptyWeights())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleWeightChange = (domain, value) => {
    setWeights(prev => ({ ...prev, [domain]: Number(value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!question.trim() || !answer.trim()) {
      setError('Question and answer are required.')
      return
    }

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured. Cannot submit questions in local mode.')
      return
    }

    setSubmitting(true)

    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const { error: insertError } = await supabase
      .from('questions')
      .insert({
        id,
        question: question.trim(),
        answer: answer.trim(),
        source: source.trim() || null,
        image_url: imageUrl.trim() || null,
        weights,
      })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSuccess(true)
    onSubmitted()

    // Auto-close after brief delay
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-xl w-[92%] max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/20 backdrop-blur-sm">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-semibold mb-4">Contribute a Question</h2>

        {success ? (
          <p className="text-green-400 text-center py-8">✓ Question added to the graph!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Question */}
            <div>
              <label className="text-gray-300 text-sm block mb-1">Question *</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                placeholder="Enter your question..."
              />
            </div>

            {/* Answer */}
            <div>
              <label className="text-gray-300 text-sm block mb-1">Answer *</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                placeholder="Enter the answer..."
              />
            </div>

            {/* Source */}
            <div>
              <label className="text-gray-300 text-sm block mb-1">Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="Book, website, or reference..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="text-gray-300 text-sm block mb-1">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                placeholder="https://..."
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-2 rounded-lg max-h-24 object-cover border border-gray-700"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </div>

            {/* Domain weights */}
            <div>
              <label className="text-gray-300 text-sm block mb-2">Domain Weights (1–10)</label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {DOMAIN_KEYS.map(domain => (
                  <div key={domain} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: DOMAINS[domain].color }}
                    />
                    <span className="text-gray-400 text-xs flex-1 truncate">{DOMAINS[domain].label}</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={weights[domain]}
                      onChange={(e) => handleWeightChange(domain, e.target.value)}
                      className="w-14 h-1 accent-purple-500"
                    />
                    <span className="text-gray-500 text-xs w-4 text-center">{weights[domain]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Add to Quiziverse'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ContributeForm
