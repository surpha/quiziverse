import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Get today's date in IST (UTC+5:30) as YYYY-MM-DD
function getTodayIST() {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return ist.toISOString().split('T')[0]
}

export function useDailyChallenge(userId) {
  const [challenge, setChallenge] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch today's challenge and user's attempt
  const fetchChallenge = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    try {
      const today = getTodayIST()

      // Get today's challenge
      const { data: challengeData, error: cErr } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today)
        .single()

      if (cErr) {
        if (cErr.code === 'PGRST116') {
          // No challenge today
          setChallenge(null)
          setAttempt(null)
          setLoading(false)
          return
        }
        throw cErr
      }

      setChallenge(challengeData)

      // Get user's attempt for this challenge
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
  }, [userId])

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
