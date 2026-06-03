import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetch a daily challenge for a specific date + user's attempt.
 * Used for archives and the /daily-challenge route.
 */
export function useDailyChallengeByDate(userId, date) {
  const [challenge, setChallenge] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchChallenge = useCallback(async () => {
    if (!supabase || !userId || !date) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: challengeData, error: cErr } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', date)
        .single()

      if (cErr) {
        if (cErr.code === 'PGRST116') {
          setChallenge(null)
          setAttempt(null)
          setLoading(false)
          return
        }
        throw cErr
      }

      setChallenge(challengeData)

      const { data: attemptData, error: aErr } = await supabase
        .from('daily_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeData.id)
        .single()

      if (aErr && aErr.code !== 'PGRST116') throw aErr
      setAttempt(attemptData || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, date])

  useEffect(() => {
    fetchChallenge()
  }, [fetchChallenge])

  // Start a new attempt
  const startAttempt = useCallback(async () => {
    if (!supabase || !userId || !challenge) return null

    const { data, error: err } = await supabase
      .from('daily_attempts')
      .insert({
        user_id: userId,
        challenge_id: challenge.id,
        answers: [],
        total_score: 0,
        completed: false,
        current_index: 0,
      })
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }
    setAttempt(data)
    return data
  }, [userId, challenge])

  // Save answer for current question
  const saveAnswer = useCallback(async (questionIndex, answer, verdict, hintsUsed, score) => {
    if (!supabase || !attempt) return null

    const updatedAnswers = [
      ...attempt.answers,
      { question_index: questionIndex, answer, verdict, hints_used: hintsUsed, score }
    ]
    const newTotal = updatedAnswers.reduce((sum, a) => sum + a.score, 0)
    const questions = challenge.questions
    const isLast = questionIndex === questions.length - 1

    const updates = {
      answers: updatedAnswers,
      total_score: newTotal,
      current_index: isLast ? questionIndex : questionIndex + 1,
      completed: isLast,
      ...(isLast ? { completed_at: new Date().toISOString() } : {}),
    }

    const { data, error: err } = await supabase
      .from('daily_attempts')
      .update(updates)
      .eq('id', attempt.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }
    setAttempt(data)
    return data
  }, [attempt, challenge])

  return {
    challenge,
    attempt,
    loading,
    error,
    startAttempt,
    saveAnswer,
    refetch: fetchChallenge,
  }
}

/**
 * Fetch all dates that have daily challenges (for calendar view).
 */
export function useDailyChallengeDates(userId) {
  const [dates, setDates] = useState([]) // { date, completed, score, maxScore }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    async function fetch() {
      try {
        // Get all challenges
        const { data: challenges, error: cErr } = await supabase
          .from('daily_challenges')
          .select('id, challenge_date, questions')
          .order('challenge_date', { ascending: false })

        if (cErr) throw cErr

        // Get all user attempts
        const { data: attempts, error: aErr } = await supabase
          .from('daily_attempts')
          .select('challenge_id, completed, total_score')
          .eq('user_id', userId)

        if (aErr) throw aErr

        const attemptMap = {}
        for (const a of attempts || []) {
          attemptMap[a.challenge_id] = a
        }

        const result = (challenges || []).map(c => {
          const att = attemptMap[c.id]
          const maxScore = (c.questions || []).reduce((sum, q) => sum + (q.max_score || 10), 0)
          return {
            date: c.challenge_date,
            challengeId: c.id,
            completed: att?.completed || false,
            score: att?.total_score || 0,
            maxScore,
          }
        })

        setDates(result)
      } catch (err) {
        console.error('Failed to fetch challenge dates:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [userId])

  return { dates, loading }
}
