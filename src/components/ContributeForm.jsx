import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import QUESTION_TYPES, { QUESTION_TYPE_KEYS } from '../utils/questionTypes'
import { classifyQuestion, isLLMConfigured } from '../utils/llmJudge'

const emptyWeights = () =>
  Object.fromEntries(DOMAIN_KEYS.map(d => [d, 1]))

function ContributeForm({ onClose, onSubmitted }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [source, setSource] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageMode, setImageMode] = useState('upload') // 'upload' | 'url'
  const [difficulty, setDifficulty] = useState(5)
  const [questionType, setQuestionType] = useState('straight')
  const [weights, setWeights] = useState(emptyWeights())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [aiClassifying, setAiClassifying] = useState(false)

  const handleWeightChange = (domain, value) => {
    setWeights(prev => ({ ...prev, [domain]: Number(value) }))
  }

  const handleAiSuggest = async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Fill in question and answer first for AI to classify.')
      return
    }
    setAiClassifying(true)
    setError(null)
    try {
      const result = await classifyQuestion(question, answer)
      setDifficulty(result.difficulty)
      setWeights(result.weights)
    } catch (err) {
      setError(`AI suggestion failed: ${err.message}`)
    }
    setAiClassifying(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
  }

  const uploadImage = async () => {
    if (!imageFile) return null

    const ext = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(fileName, imageFile, { contentType: imageFile.type })

    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)

    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
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

    try {
      // Resolve final image URL
      let finalImageUrl = null
      if (imageMode === 'upload' && imageFile) {
        finalImageUrl = await uploadImage()
      } else if (imageMode === 'url' && imageUrl.trim()) {
        finalImageUrl = imageUrl.trim()
      }

      const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          id,
          question: question.trim(),
          answer: answer.trim(),
          source: source.trim() || null,
          image_url: finalImageUrl,
          difficulty,
          type: questionType,
          weights,
          status: 'pending',
        })

      if (insertError) throw new Error(insertError.message)

      setSuccess(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
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
          <p className="text-green-400 text-center py-8">✓ Question submitted for review! An admin will approve it soon.</p>
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

            {/* AI Suggest button */}
            {isLLMConfigured() && (
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiClassifying}
                className="w-full py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 disabled:opacity-50 text-blue-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                {aiClassifying ? '🔄 AI is analyzing...' : '🤖 AI Suggest Difficulty & Domains'}
              </button>
            )}

            {/* Difficulty & Type row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm block mb-1">Difficulty (1–10)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="flex-1 h-1 accent-purple-500"
                  />
                  <span className="text-white text-sm font-medium w-5 text-center">{difficulty}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>Easy</span>
                  <span>Hard</span>
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm block mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {QUESTION_TYPE_KEYS.map(key => (
                    <option key={key} value={key}>
                      {QUESTION_TYPES[key].icon} {QUESTION_TYPES[key].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image */}
            <div>
              <label className="text-gray-300 text-sm block mb-2">Image (optional)</label>
              {/* Toggle between upload and URL */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
                    imageMode === 'upload'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
                    imageMode === 'url'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Paste URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 file:cursor-pointer cursor-pointer"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mt-2 rounded-lg max-h-24 object-cover border border-gray-700"
                    />
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="https://i.imgur.com/example.jpg"
                  />
                  <p className="text-gray-600 text-xs mt-1">Works with Imgur, Unsplash, Wikimedia, or any direct image URL</p>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="mt-2 rounded-lg max-h-24 object-cover border border-gray-700"
                      onError={(e) => { e.target.style.display = 'none' }}
                      onLoad={(e) => { e.target.style.display = 'block' }}
                    />
                  )}
                </div>
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
