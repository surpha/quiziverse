import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Computes the user's daily challenge streak by checking
 * consecutive completed attempts working backward from today.
 */
export function useStreak(userId) {
  const [streak, setStreak] = useState(0)
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

      // Extract unique completed dates
      const completedDates = new Set()
      ;(data || []).forEach(a => {
        const date = a.daily_challenges?.challenge_date
        if (date) completedDates.add(date)
      })

      // Count consecutive days backward from today
      let count = 0
      const today = new Date()
      // Start from today
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
    } catch {
      setStreak(0)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    computeStreak()
  }, [computeStreak])

  return { streak, loading, refetchStreak: computeStreak }
}
