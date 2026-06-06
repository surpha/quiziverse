import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function LiveQuizLeaderboard({ quiz, userId, onExit }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [myResponse, setMyResponse] = useState(null)
  const [tab, setTab] = useState('review') // 'review' | 'leaderboard'

  useEffect(() => {
    fetchLeaderboard()
  }, [quiz.id])

  const fetchLeaderboard = async () => {
    // Fetch all evaluated responses for this quiz
    const { data, error } = await supabase
      .from('live_quiz_responses')
      .select('*')
      .eq('quiz_id', quiz.id)
      .eq('evaluated', true)
      .order('total_score', { ascending: false })

    if (error) console.error('Leaderboard fetch error:', error)

    const sorted = data || []

    // Fetch profiles separately for display names
    if (sorted.length > 0) {
      const userIds = sorted.map(r => r.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_emoji')
        .in('id', userIds)

      const profileMap = {}
      ;(profiles || []).forEach(p => { profileMap[p.id] = p })
      sorted.forEach(r => { r.profiles = profileMap[r.user_id] || null })
    }

    setResponses(sorted)
    setMyResponse(sorted.find(r => r.user_id === userId) || null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-950 flex items-center justify-center">
        <p className="text-cyan-400 text-sm animate-pulse font-orbitron">Loading results...</p>
      </div>
    )
  }

  const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0)
  const myRank = responses.findIndex(r => r.user_id === userId) + 1

  return (
    <div className="w-full h-full bg-gray-950 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/10 via-transparent to-cyan-950/10 pointer-events-none" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-sm font-orbitron tracking-wider">{quiz.title}</h1>
            <p className="text-gray-500 text-[10px]">Results • {responses.length} participant{responses.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onExit} className="text-gray-400 hover:text-cyan-300 text-sm cursor-pointer">← Exit</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 max-w-2xl mx-auto mt-3">
          <button
            onClick={() => setTab('review')}
            className={`text-xs pb-1 cursor-pointer border-b-2 transition-colors ${tab === 'review' ? 'text-cyan-300 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            📝 My Answers
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`text-xs pb-1 cursor-pointer border-b-2 transition-colors ${tab === 'leaderboard' ? 'text-cyan-300 border-cyan-400' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
          >
            🏆 Leaderboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Score summary */}
          {myResponse && (
            <div className="mb-6 glass glow-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-400 text-xs">Your Score</span>
                  <p className="text-cyan-300 text-2xl font-orbitron">
                    {myResponse.total_score} <span className="text-gray-500 text-sm">/ {maxScore}</span>
                  </p>
                </div>
                {myRank > 0 && (
                  <div className="text-right">
                    <span className="text-gray-400 text-xs">Rank</span>
                    <p className="text-amber-300 text-2xl font-orbitron">#{myRank}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review tab */}
          {tab === 'review' && myResponse && (
            <div className="space-y-3">
              {quiz.questions.map((q, i) => {
                const myAnswer = myResponse.answers?.find(a => a.question_index === i)
                const score = myResponse.scores?.find(s => s.question_index === i)
                const verdictColor = score?.verdict === 'correct' ? 'border-emerald-500/30 bg-emerald-900/20' :
                  score?.verdict === 'partially_correct' ? 'border-amber-500/30 bg-amber-900/20' :
                  'border-red-500/30 bg-red-900/20'
                const verdictIcon = score?.verdict === 'correct' ? '✓' :
                  score?.verdict === 'partially_correct' ? '~' : '✗'
                const verdictTextColor = score?.verdict === 'correct' ? 'text-emerald-400' :
                  score?.verdict === 'partially_correct' ? 'text-amber-400' : 'text-red-400'

                return (
                  <div key={i} className={`rounded-lg border p-4 ${verdictColor}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white text-sm">
                        <span className="text-gray-500 mr-2">{i + 1}.</span>
                        {q.question}
                      </p>
                      <span className={`shrink-0 text-sm font-medium ${verdictTextColor}`}>
                        {verdictIcon} {score?.score || 0}/{q.points}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-400">
                        Your answer: <span className="text-white">{myAnswer?.answer || '(blank)'}</span>
                      </p>
                      <p className="text-gray-400">
                        Correct answer: <span className="text-emerald-300">{q.answer}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'review' && !myResponse && (
            <p className="text-gray-500 text-sm text-center">You didn't submit answers for this quiz.</p>
          )}

          {/* Leaderboard tab */}
          {tab === 'leaderboard' && (
            <div className="space-y-2">
              {responses.length === 0 && (
                <p className="text-gray-500 text-sm text-center">No results yet.</p>
              )}
              {responses.map((resp, i) => {
                const isMe = resp.user_id === userId
                return (
                  <div
                    key={resp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isMe ? 'bg-cyan-900/20 border border-cyan-500/20' : 'bg-gray-800/30'
                    }`}
                  >
                    <span className="text-gray-500 text-sm font-orbitron w-6 text-right">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span className="text-lg">{resp.profiles?.avatar_emoji || '✦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                        {resp.profiles?.display_name || resp.profiles?.username || 'Player'}
                        {isMe && <span className="text-cyan-400/60 text-xs ml-1">(you)</span>}
                      </p>
                    </div>
                    <span className={`text-sm font-orbitron ${isMe ? 'text-cyan-300' : 'text-gray-300'}`}>
                      {resp.total_score}
                    </span>
                    <span className="text-gray-600 text-xs">/{maxScore}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
