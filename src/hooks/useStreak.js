import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Computes the user's daily challenge streak, max streak, and total played.
 */
export function useStreak(userId) {
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [totalPlayed, setTotalPlayed] = useState(0)
  const [loading, setLoading] = useState(true)

  const computeStreak = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    try {
      // Get all completed attempts with their challenge dates, ordered recent-first
      const { data, error } = await supabase
        .from('daily_attempts')
        .select('challenge_id, completed, daily_challenges(challenge_date)')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('started_at', { ascending: false })

      if (error) throw error

      // Extract unique completed dates sorted descending
      const completedDates = new Set()
      ;(data || []).forEach(a => {
        const date = a.daily_challenges?.challenge_date
        if (date) completedDates.add(date)
      })

      // Total played = unique completed dates
      setTotalPlayed(completedDates.size)

      // Sort dates ascending to compute max streak
      const sortedDates = [...completedDates].sort()

      // Compute current streak (backward from today)
      let count = 0
      const today = new Date()
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      while (true) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (completedDates.has(dateStr)) {
          count++
          d.setDate(d.getDate() - 1)
        } else if (count === 0) {
          // Today not yet completed — check if yesterday continues a streak
          d.setDate(d.getDate() - 1)
          const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (completedDates.has(yesterdayStr)) {
            count++
            d.setDate(d.getDate() - 1)
          } else {
            break
          }
        } else {
          break
        }
      }

      setStreak(count)

      // Compute max streak from sorted dates
      let best = 0
      let current = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diff = (curr - prev) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          current++
        } else {
          best = Math.max(best, current)
          current = 1
        }
      }
      best = Math.max(best, current)
      setMaxStreak(sortedDates.length > 0 ? best : 0)
    } catch {
      setStreak(0)
      setMaxStreak(0)
      setTotalPlayed(0)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    computeStreak()
  }, [computeStreak])

  return { streak, maxStreak, totalPlayed, loading, refetchStreak: computeStreak }
}
