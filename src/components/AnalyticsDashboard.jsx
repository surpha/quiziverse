import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#ef4444']

export default function AnalyticsDashboard({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)
  const [tab, setTab] = useState('users') // 'users' | 'challenges' | 'engagement'

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const [profilesRes, attemptsRes, challengesRes] = await Promise.all([
        supabase.from('profiles').select('id, email, created_at, avatar_url'),
        supabase.from('daily_attempts').select('user_id, total_score, completed, completed_at, started_at, answers, challenge_id'),
        supabase.from('daily_challenges').select('id, challenge_date, questions'),
      ])

      const profiles = profilesRes.data || []
      const attempts = attemptsRes.data || []
      const challenges = challengesRes.data || []

      // --- USERS ---
      const totalSignups = profiles.length
      // Google users have avatar_url set, or email ends with gmail and was created via OAuth
      const googleUsers = profiles.filter(p => p.avatar_url || p.email?.endsWith('@gmail.com')).length
      const emailUsers = totalSignups - googleUsers

      // Signups per day (last 30 days)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const signupsPerDay = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        signupsPerDay[d.toISOString().split('T')[0]] = 0
      }
      profiles.forEach(p => {
        const day = p.created_at?.split('T')[0]
        if (day && signupsPerDay[day] !== undefined) signupsPerDay[day]++
      })
      const signupsTrend = Object.entries(signupsPerDay).map(([date, count]) => ({
        date: date.slice(5), // MM-DD
        count,
      }))

      // DAU/WAU from attempts (unique users with activity)
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const dau = new Set(attempts.filter(a => a.started_at?.split('T')[0] === today).map(a => a.user_id)).size
      const wau = new Set(attempts.filter(a => a.started_at?.split('T')[0] >= sevenDaysAgo).map(a => a.user_id)).size

      // Retention: users who signed up and came back day 1, 7, 30
      const retention = calculateRetention(profiles, attempts)

      // --- DAILY CHALLENGE ---
      const completedAttempts = attempts.filter(a => a.completed)
      const startedAttempts = attempts.length
      const completionRate = startedAttempts > 0 ? Math.round((completedAttempts.length / startedAttempts) * 100) : 0

      // Compute average score and max per challenge
      const challengeMap = {}
      ;(challenges || []).forEach(c => { challengeMap[c.id] = c.questions })

      let totalMaxScore = 0
      const avgScorePerChallenge = completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((s, a) => {
            const qs = challengeMap[a.challenge_id] || []
            const max = qs.reduce((m, q) => m + (q.max_score || 10), 0)
            totalMaxScore += max
            return s + (a.total_score || 0)
          }, 0) / completedAttempts.length * 10) / 10
        : 0
      const avgMaxPerChallenge = completedAttempts.length > 0
        ? Math.round(totalMaxScore / completedAttempts.length)
        : 50

      const totalAnswers = attempts.reduce((s, a) => s + (a.answers?.length || 0), 0)
      const totalScoreAllAnswers = attempts.reduce((s, a) =>
        s + (a.answers || []).reduce((ss, ans) => ss + (ans.score || 0), 0), 0)
      const avgScorePerQuestion = totalAnswers > 0 ? Math.round(totalScoreAllAnswers / totalAnswers * 10) / 10 : 0

      // Completions per day (last 30 days)
      const completionsPerDay = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        completionsPerDay[d.toISOString().split('T')[0]] = 0
      }
      completedAttempts.forEach(a => {
        const day = a.completed_at?.split('T')[0]
        if (day && completionsPerDay[day] !== undefined) completionsPerDay[day]++
      })
      const completionsTrend = Object.entries(completionsPerDay).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }))

      // Peak play time (hour distribution)
      const hourDist = Array(24).fill(0)
      attempts.forEach(a => {
        if (a.started_at) {
          const hour = new Date(a.started_at).getHours()
          hourDist[hour]++
        }
      })
      const peakHours = hourDist.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count,
      }))

      // Participation rate
      const participationRate = dau > 0 && totalSignups > 0
        ? Math.round((dau / totalSignups) * 100) : 0

      // --- ENGAGEMENT ---
      // Streak distribution
      const userStreaks = calculateStreaks(profiles, completedAttempts)
      const streakBuckets = [
        { label: '0 days', count: userStreaks.filter(s => s === 0).length },
        { label: '1-3', count: userStreaks.filter(s => s >= 1 && s <= 3).length },
        { label: '4-7', count: userStreaks.filter(s => s >= 4 && s <= 7).length },
        { label: '8-14', count: userStreaks.filter(s => s >= 8 && s <= 14).length },
        { label: '15-30', count: userStreaks.filter(s => s >= 15 && s <= 30).length },
        { label: '30+', count: userStreaks.filter(s => s > 30).length },
      ]

      // Questions answered trend (last 30 days)
      const answersPerDay = {}
      for (let i = 0; i < 30; i++) {
        const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        answersPerDay[d.toISOString().split('T')[0]] = 0
      }
      attempts.forEach(a => {
        const day = a.started_at?.split('T')[0]
        if (day && answersPerDay[day] !== undefined) {
          answersPerDay[day] += (a.answers?.length || 0)
        }
      })
      const answersTrend = Object.entries(answersPerDay).map(([date, count]) => ({
        date: date.slice(5),
        count,
      }))

      // Avg challenges per user (session length proxy)
      const uniqueUsers = new Set(attempts.map(a => a.user_id)).size
      const avgChallengesPerUser = uniqueUsers > 0
        ? Math.round(completedAttempts.length / uniqueUsers * 10) / 10 : 0

      // Return rate (users who played yesterday and today)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const usersYesterday = new Set(attempts.filter(a => a.started_at?.split('T')[0] === yesterday).map(a => a.user_id))
      const usersToday = new Set(attempts.filter(a => a.started_at?.split('T')[0] === today).map(a => a.user_id))
      const returnedToday = [...usersYesterday].filter(u => usersToday.has(u)).length
      const returnRate = usersYesterday.size > 0 ? Math.round((returnedToday / usersYesterday.size) * 100) : 0

      setMetrics({
        users: { totalSignups, googleUsers, emailUsers, dau, wau, signupsTrend, retention },
        challenges: { completedAttempts: completedAttempts.length, startedAttempts, completionRate, avgScorePerChallenge, avgMaxPerChallenge, avgScorePerQuestion, completionsTrend, peakHours, participationRate },
        engagement: { streakBuckets, answersTrend, avgChallengesPerUser, returnRate, totalAnswers },
      })
    } catch (err) {
      console.error('Analytics fetch error:', err)
    }
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <div className="glass glow-border rounded-2xl p-6 max-w-4xl w-[95%] max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-lg font-orbitron tracking-wider">Analytics Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'users', label: '👥 Users' },
            { key: 'challenges', label: '📅 Challenges' },
            { key: 'engagement', label: '🔥 Engagement' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                tab === t.key
                  ? 'bg-cyan-600/80 text-white'
                  : 'glass text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-cyan-400 text-sm animate-pulse text-center py-12">Loading analytics...</p>
        ) : metrics && (
          <>
            {tab === 'users' && <UsersTab data={metrics.users} />}
            {tab === 'challenges' && <ChallengesTab data={metrics.challenges} />}
            {tab === 'engagement' && <EngagementTab data={metrics.engagement} />}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-gray-900/60 rounded-xl p-4 text-center">
      <p className="text-white text-xl font-orbitron">{value}</p>
      <p className="text-gray-400 text-xs uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

function UsersTab({ data }) {
  return (
    <div className="space-y-5">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Signups" value={data.totalSignups} />
        <StatCard label="DAU" value={data.dau} sub="Today" />
        <StatCard label="WAU" value={data.wau} sub="Last 7 days" />
        <StatCard label="Auth Split" value={`${data.googleUsers}G / ${data.emailUsers}E`} sub="Google vs Email" />
      </div>

      {/* Retention */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Retention</p>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-cyan-300 text-lg font-orbitron">{data.retention.day1}%</p>
            <p className="text-gray-500 text-xs">Day 1</p>
          </div>
          <div className="text-center">
            <p className="text-cyan-300 text-lg font-orbitron">{data.retention.day7}%</p>
            <p className="text-gray-500 text-xs">Day 7</p>
          </div>
          <div className="text-center">
            <p className="text-cyan-300 text-lg font-orbitron">{data.retention.day30}%</p>
            <p className="text-gray-500 text-xs">Day 30</p>
          </div>
        </div>
      </div>

      {/* Signups chart */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">New Signups (Last 30 Days)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.signupsTrend}>
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            <Bar dataKey="count" fill="#06b6d4" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ChallengesTab({ data }) {
  return (
    <div className="space-y-5">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Completed" value={data.completedAttempts} />
        <StatCard label="Completion Rate" value={`${data.completionRate}%`} sub={`${data.completedAttempts}/${data.startedAttempts}`} />
        <StatCard label="Avg Score/Challenge" value={data.avgScorePerChallenge} sub={`out of ${data.avgMaxPerChallenge}`} />
        <StatCard label="Avg Score/Question" value={data.avgScorePerQuestion} sub="per Question" />
      </div>

      {/* Participation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard label="Participation Rate" value={`${data.participationRate}%`} sub="DAU who complete a challenge" />
      </div>

      {/* Completions per day chart */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Completions Per Day (Last 30 Days)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.completionsTrend}>
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Peak hours */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Peak Play Time (Hour of Day)</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data.peakHours}>
            <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 9 }} interval={3} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EngagementTab({ data }) {
  return (
    <div className="space-y-5">
      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Answers" value={data.totalAnswers} />
        <StatCard label="Return Rate" value={`${data.returnRate}%`} sub="Yesterday → Today" />
        <StatCard label="Avg Challenges/User" value={data.avgChallengesPerUser} />
      </div>

      {/* Streak distribution */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Streak Distribution</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.streakBuckets}>
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            <Bar dataKey="count" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Answers trend */}
      <div className="bg-gray-900/60 rounded-xl p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Questions Answered (Last 30 Days)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.answersTrend}>
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
            <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// --- Helper functions ---

function calculateRetention(profiles, attempts) {
  const now = new Date()
  let day1 = 0, day7 = 0, day30 = 0
  let eligible1 = 0, eligible7 = 0, eligible30 = 0

  profiles.forEach(p => {
    if (!p.created_at) return
    const signupDate = new Date(p.created_at)
    const daysSinceSignup = Math.floor((now - signupDate) / (1000 * 60 * 60 * 24))

    const userAttemptDates = new Set(
      attempts
        .filter(a => a.user_id === p.id && a.started_at)
        .map(a => {
          const diff = Math.floor((new Date(a.started_at) - signupDate) / (1000 * 60 * 60 * 24))
          return diff
        })
    )

    if (daysSinceSignup >= 1) {
      eligible1++
      if (userAttemptDates.has(1)) day1++
    }
    if (daysSinceSignup >= 7) {
      eligible7++
      if ([...userAttemptDates].some(d => d >= 6 && d <= 8)) day7++
    }
    if (daysSinceSignup >= 30) {
      eligible30++
      if ([...userAttemptDates].some(d => d >= 28 && d <= 32)) day30++
    }
  })

  return {
    day1: eligible1 > 0 ? Math.round((day1 / eligible1) * 100) : 0,
    day7: eligible7 > 0 ? Math.round((day7 / eligible7) * 100) : 0,
    day30: eligible30 > 0 ? Math.round((day30 / eligible30) * 100) : 0,
  }
}

function calculateStreaks(profiles, completedAttempts) {
  return profiles.map(p => {
    const dates = completedAttempts
      .filter(a => a.user_id === p.id && a.completed_at)
      .map(a => a.completed_at.split('T')[0])
      .sort()
      .reverse()

    if (dates.length === 0) return 0

    let streak = 0
    const now = new Date()
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    let checkDate = ist.toISOString().split('T')[0]

    if (!dates.includes(checkDate)) {
      const yesterday = new Date(ist.getTime() - 24 * 60 * 60 * 1000)
      checkDate = yesterday.toISOString().split('T')[0]
    }

    for (let i = 0; i < 365; i++) {
      if (dates.includes(checkDate)) {
        streak++
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().split('T')[0]
      } else {
        break
      }
    }
    return streak
  })
}
