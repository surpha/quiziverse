import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEvent(slug, userId) {
  const [event, setEvent] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEvent = useCallback(async () => {
    if (!supabase || !slug) {
      setLoading(false)
      return
    }

    try {
      const { data: eventData, error: eErr } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (eErr) {
        if (eErr.code === 'PGRST116') {
          setEvent(null)
          setLoading(false)
          return
        }
        throw eErr
      }

      setEvent(eventData)

      // Get user's attempt if logged in
      if (userId) {
        const { data: attemptData, error: aErr } = await supabase
          .from('event_attempts')
          .select('*')
          .eq('user_id', userId)
          .eq('event_id', eventData.id)
          .single()

        if (aErr && aErr.code !== 'PGRST116') throw aErr
        setAttempt(attemptData || null)
      }

      // Fetch leaderboard (top 20)
      const { data: lbData } = await supabase
        .from('event_attempts')
        .select('user_id, total_score, completed_at')
        .eq('event_id', eventData.id)
        .eq('completed', true)
        .order('total_score', { ascending: false })
        .order('completed_at', { ascending: true })
        .limit(20)

      if (lbData && lbData.length > 0) {
        // Fetch usernames for leaderboard
        const userIds = lbData.map(l => l.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', userIds)

        const profileMap = {}
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })

        setLeaderboard(lbData.map(l => ({
          ...l,
          username: profileMap[l.user_id]?.username || profileMap[l.user_id]?.full_name || 'Anonymous'
        })))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [slug, userId])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const startAttempt = useCallback(async () => {
    if (!supabase || !userId || !event) return null

    const { data, error: err } = await supabase
      .from('event_attempts')
      .insert({
        user_id: userId,
        event_id: event.id,
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
  }, [userId, event])

  const saveAnswer = useCallback(async (questionIndex, answer, verdict, hintsUsed, score) => {
    if (!supabase || !attempt) return null

    const updatedAnswers = [
      ...attempt.answers,
      { question_index: questionIndex, answer, verdict, hints_used: hintsUsed, score }
    ]
    const newTotal = updatedAnswers.reduce((sum, a) => sum + a.score, 0)
    const questions = event.questions
    const isLast = questionIndex === questions.length - 1

    const updates = {
      answers: updatedAnswers,
      total_score: newTotal,
      current_index: isLast ? questionIndex : questionIndex + 1,
      completed: isLast,
      ...(isLast ? { completed_at: new Date().toISOString() } : {}),
    }

    const { data, error: err } = await supabase
      .from('event_attempts')
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
  }, [attempt, event])

  const saveFeedback = useCallback(async (ratingExperience, ratingQuestions, feedback) => {
    if (!supabase || !attempt) return null

    const { data, error: err } = await supabase
      .from('event_attempts')
      .update({
        rating_experience: ratingExperience,
        rating_questions: ratingQuestions,
        feedback: feedback || null,
      })
      .eq('id', attempt.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      return null
    }
    setAttempt(data)
    return data
  }, [attempt])

  return {
    event,
    attempt,
    leaderboard,
    loading,
    error,
    startAttempt,
    saveAnswer,
    saveFeedback,
    refetch: fetchEvent,
  }
}
