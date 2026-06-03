import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook to fetch and manage play attempts for the current user.
 * Returns a map of question_id -> verdict for quick lookup.
 */
export function usePlayAttempts(userId) {
  const [attempts, setAttempts] = useState({}) // { [questionId]: verdict }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    async function fetch() {
      const { data, error } = await supabase
        .from('play_attempts')
        .select('question_id, verdict')
        .eq('user_id', userId)

      if (!error && data) {
        const map = {}
        for (const row of data) {
          map[row.question_id] = row.verdict
        }
        setAttempts(map)
      }
      setLoading(false)
    }

    fetch()
  }, [userId])

  const recordAttempt = useCallback(async (questionId, verdict) => {
    if (!supabase || !userId) return

    // Upsert: insert or update on conflict
    const { error } = await supabase
      .from('play_attempts')
      .upsert({
        user_id: userId,
        question_id: questionId,
        verdict,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'user_id,question_id' })

    if (!error) {
      setAttempts(prev => ({ ...prev, [questionId]: verdict }))
    }
  }, [userId])

  return { attempts, loading, recordAttempt }
}
