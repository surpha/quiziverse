import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'

const EMOJI_OPTIONS = ['✦', '🚀', '🌟', '🧠', '🎯', '🔥', '💎', '🦉', '🐙', '🌈', '⚡', '🎵', '🎨', '🧬', '📚', '🏆', '🌍', '👾', '🦊', '🐺']

const LEAGUE_THRESHOLDS = [
  { name: 'Nebula', min: 0, color: '#6b7280', emoji: '☁️' },
  { name: 'Meteor', min: 50, color: '#f59e0b', emoji: '☄️' },
  { name: 'Star', min: 150, color: '#06b6d4', emoji: '⭐' },
  { name: 'Supernova', min: 400, color: '#8b5cf6', emoji: '💫' },
  { name: 'Galaxy', min: 1000, color: '#ec4899', emoji: '🌌' },
]

function getLeague(totalXP) {
  for (let i = LEAGUE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEAGUE_THRESHOLDS[i].min) return LEAGUE_THRESHOLDS[i]
  }
  return LEAGUE_THRESHOLDS[0]
}

function getNextLeague(totalXP) {
  for (let i = 0; i < LEAGUE_THRESHOLDS.length; i++) {
    if (totalXP < LEAGUE_THRESHOLDS[i].min) return LEAGUE_THRESHOLDS[i]
  }
  return null
}

export default function UserProfile({ user, profile, onClose, onProfileUpdate, onSignOut }) {
  const [editing, setEditing] = useState(false)
  const [contributions, setContributions] = useState(0)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || '✦')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch contributions count
  useEffect(() => {
    if (!supabase || !user) return
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by', user.id)
      .then(({ count }) => setContributions(count || 0))
  }, [user])

  // Fetch user stats
  useEffect(() => {
    if (!supabase || !user) return
    const fetchStats = async () => {
      setStatsLoading(true)
      try {
        // Get all completed daily attempts
        const { data: attempts } = await supabase
          .from('daily_attempts')
          .select('total_score, completed, completed_at, answers, challenge_id')
          .eq('user_id', user.id)
          .eq('completed', true)

        const totalXP = (attempts || []).reduce((sum, a) => sum + (a.total_score || 0), 0)
        const totalChallenges = (attempts || []).length
        const totalAnswered = (attempts || []).reduce((sum, a) => sum + (a.answers?.length || 0), 0)

        // Calculate streak (consecutive days with completed challenges)
        const completedDates = (attempts || [])
          .filter(a => a.completed_at)
          .map(a => new Date(a.completed_at).toISOString().split('T')[0])
          .sort()
          .reverse()

        let streak = 0
        if (completedDates.length > 0) {
          const today = new Date()
          const ist = new Date(today.getTime() + (5.5 * 60 * 60 * 1000))
          let checkDate = ist.toISOString().split('T')[0]

          // If today's not completed, start from yesterday
          if (!completedDates.includes(checkDate)) {
            ist.setDate(ist.getDate() - 1)
            checkDate = ist.toISOString().split('T')[0]
          }

          for (let i = 0; i < 365; i++) {
            if (completedDates.includes(checkDate)) {
              streak++
              const d = new Date(checkDate)
              d.setDate(d.getDate() - 1)
              checkDate = d.toISOString().split('T')[0]
            } else {
              break
            }
          }
        }

        // Domain breakdown from answers
        // We'd need challenge questions data for this, so we'll fetch challenges
        const challengeIds = [...new Set((attempts || []).map(a => a.challenge_id))]
        let domainXP = {}
        if (challengeIds.length > 0) {
          const { data: challenges } = await supabase
            .from('daily_challenges')
            .select('id, questions')
            .in('id', challengeIds)

          const challengeMap = {}
          ;(challenges || []).forEach(c => { challengeMap[c.id] = c.questions })

          ;(attempts || []).forEach(a => {
            const questions = challengeMap[a.challenge_id] || []
            ;(a.answers || []).forEach(ans => {
              const q = questions[ans.question_index]
              if (q?.weights) {
                DOMAIN_KEYS.forEach(domain => {
                  const weight = q.weights[domain] || 0
                  if (weight > 3 && ans.score > 0) {
                    domainXP[domain] = (domainXP[domain] || 0) + ans.score
                  }
                })
              }
            })
          })
        }

        setStats({ totalXP, totalChallenges, totalAnswered, streak, domainXP })
      } catch (err) {
        console.warn('Stats fetch error:', err.message)
        setStats({ totalXP: 0, totalChallenges: 0, totalAnswered: 0, streak: 0, domainXP: {} })
      }
      setStatsLoading(false)
    }
    fetchStats()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updates = {
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        avatar_emoji: avatarEmoji,
      }

      // Check username uniqueness if changed
      if (username.trim() && username.trim() !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .neq('id', user.id)
          .single()
        if (existing) {
          setError('Username already taken')
          setSaving(false)
          return
        }
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (updateErr) throw new Error(updateErr.message)

      onProfileUpdate({ ...profile, ...updates })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const league = getLeague(stats?.totalXP || 0)
  const nextLeague = getNextLeague(stats?.totalXP || 0)
  const progressToNext = nextLeague
    ? Math.round(((stats?.totalXP || 0) - league.min) / (nextLeague.min - league.min) * 100)
    : 100

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="glass glow-border rounded-2xl p-6 max-w-md w-[92%] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-lg font-orbitron tracking-wider">Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-16 h-16 rounded-full border-2 border-cyan-500/30 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full glass border border-cyan-500/30 flex items-center justify-center text-3xl">
              {avatarEmoji}
            </div>
          )}
          <div className="flex-1">
            <p className="text-white text-base font-medium">
              {profile?.display_name || user?.email?.split('@')[0]}
            </p>
            {profile?.username && (
              <p className="text-cyan-400 text-sm">@{profile.username}</p>
            )}
            <p className="text-gray-500 text-xs">{user?.email}</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 glass text-cyan-300 text-xs rounded-lg cursor-pointer hover:bg-cyan-900/20"
            >
              Edit
            </button>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mb-6 space-y-3 bg-gray-900/50 rounded-xl p-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                placeholder="Your name"
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Username</label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-1">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  placeholder="username"
                  maxLength={20}
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Avatar Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatarEmoji(emoji)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-all ${
                      avatarEmoji === emoji
                        ? 'bg-cyan-900/50 ring-2 ring-cyan-500 scale-110'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setError(null) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {statsLoading ? (
          <p className="text-cyan-400 text-sm animate-pulse text-center py-4">Loading stats...</p>
        ) : stats && (
          <div className="space-y-4">
            {/* League */}
            <div className="bg-gray-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{league.emoji}</span>
                  <span className="text-white text-sm font-medium" style={{ color: league.color }}>{league.name} League</span>
                </div>
                <span className="text-cyan-300 text-sm font-orbitron">{stats.totalXP} XP</span>
              </div>
              {nextLeague && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{league.name}</span>
                    <span>{nextLeague.name} ({nextLeague.min} XP)</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressToNext}%`, backgroundColor: league.color }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-orbitron">{stats.totalAnswered}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Answers</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-orbitron">{stats.streak}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Day Streak</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                <p className="text-white text-lg font-orbitron">{stats.totalChallenges}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Challenges</p>
              </div>
            </div>

            {/* Contributions */}
            <div className="bg-gray-900/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">📝</span>
                <div>
                  <p className="text-white text-sm font-medium">Contributions</p>
                  <p className="text-gray-500 text-xs">Questions submitted</p>
                </div>
              </div>
              <p className="text-cyan-300 text-lg font-orbitron">{contributions}</p>
            </div>

            {/* Domain breakdown */}
            {Object.keys(stats.domainXP).length > 0 && (
              <div className="bg-gray-900/50 rounded-xl p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Domain XP</p>
                <div className="space-y-2">
                  {DOMAIN_KEYS
                    .filter(d => stats.domainXP[d] > 0)
                    .sort((a, b) => (stats.domainXP[b] || 0) - (stats.domainXP[a] || 0))
                    .map(domain => {
                      const xp = stats.domainXP[domain]
                      const maxDomainXP = Math.max(...Object.values(stats.domainXP))
                      const pct = Math.round((xp / maxDomainXP) * 100)
                      return (
                        <div key={domain} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAINS[domain]?.color }} />
                          <span className="text-gray-300 text-xs w-24 truncate">{DOMAINS[domain]?.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: DOMAINS[domain]?.color }}
                            />
                          </div>
                          <span className="text-gray-500 text-xs w-8 text-right">{xp}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="w-full mt-2 px-4 py-2.5 bg-red-900/30 hover:bg-red-800/50 border border-red-500/20 text-red-400 text-sm rounded-xl cursor-pointer transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
