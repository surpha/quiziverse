import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for live quiz functionality.
 * Handles real-time state sync, autosaving answers, and evaluation.
 */
export function useLiveQuiz(slug, userId) {
  const [quiz, setQuiz] = useState(null)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const subscriptionRef = useRef(null)

  // Fetch quiz by slug
  const fetchQuiz = useCallback(async () => {
    if (!supabase || !slug) { setLoading(false); return }

    const { data, error: err } = await supabase
      .from('live_quizzes')
      .select('*')
      .eq('slug', slug)
      .single()

    if (err) {
      setError(err.code === 'PGRST116' ? 'Quiz not found' : err.message)
      setLoading(false)
      return
    }
    setQuiz(data)

    // Fetch user's response if exists
    if (userId) {
      const { data: resp } = await supabase
        .from('live_quiz_responses')
        .select('*')
        .eq('quiz_id', data.id)
        .eq('user_id', userId)
        .single()

      setResponse(resp || null)
    }
    setLoading(false)
  }, [slug, userId])

  useEffect(() => {
    fetchQuiz()
  }, [fetchQuiz])

  // Real-time subscription on quiz status changes
  useEffect(() => {
    if (!supabase || !quiz?.id) return

    const channel = supabase
      .channel(`live-quiz-${quiz.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_quizzes',
        filter: `id=eq.${quiz.id}`,
      }, (payload) => {
        setQuiz(payload.new)
      })
      .subscribe()

    subscriptionRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [quiz?.id])

  // Subscribe to own response updates (for when quizmaster evaluates)
  useEffect(() => {
    if (!supabase || !quiz?.id || !userId) return

    const channel = supabase
      .channel(`live-resp-${quiz.id}-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_quiz_responses',
        filter: `quiz_id=eq.${quiz.id}`,
      }, (payload) => {
        if (payload.new?.user_id === userId) {
          setResponse(payload.new)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [quiz?.id, userId])

  // Join quiz (create response entry)
  const joinQuiz = useCallback(async () => {
    if (!supabase || !quiz || !userId) return null
    if (response) return response // Already joined

    const emptyAnswers = Array.from({ length: quiz.num_questions }, (_, i) => ({
      question_index: i,
      answer: '',
    }))

    const { data, error: err } = await supabase
      .from('live_quiz_responses')
      .upsert({
        quiz_id: quiz.id,
        user_id: userId,
        answers: emptyAnswers,
      }, { onConflict: 'quiz_id,user_id' })
      .select()
      .single()

    if (err) { setError(err.message); return null }
    setResponse(data)
    return data
  }, [quiz, userId, response])

  // Save answers (debounced autosave from component)
  const saveAnswers = useCallback(async (answers) => {
    if (!supabase || !response) return
    if (quiz?.status !== 'live') return // Can't save if not live

    const { data, error: err } = await supabase
      .from('live_quiz_responses')
      .update({ answers, submitted_at: new Date().toISOString() })
      .eq('id', response.id)
      .select()
      .single()

    if (!err) setResponse(data)
  }, [response, quiz?.status])

  return {
    quiz,
    response,
    loading,
    error,
    joinQuiz,
    saveAnswers,
    refetch: fetchQuiz,
  }
}

/**
 * Hook for quizmaster admin operations.
 */
export function useLiveQuizAdmin(userId) {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !userId) { setLoading(false); return }
    fetchQuizzes()
  }, [userId])

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from('live_quizzes')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    setQuizzes(data || [])
    setLoading(false)
  }

  const createQuiz = async (title, slug, questions) => {
    const { data, error } = await supabase
      .from('live_quizzes')
      .insert({
        title,
        slug,
        created_by: userId,
        questions,
        num_questions: questions.length,
        status: 'draft',
      })
      .select()
      .single()

    if (!error) setQuizzes(prev => [data, ...prev])
    return { data, error }
  }

  const updateStatus = async (quizId, status) => {
    const updates = { status }
    if (status === 'locked') updates.locked_at = new Date().toISOString()
    if (status === 'results') updates.evaluated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('live_quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single()

    if (!error) {
      setQuizzes(prev => prev.map(q => q.id === quizId ? data : q))
    }
    return { data, error }
  }

  const updateQuiz = async (quizId, updates) => {
    const { data, error } = await supabase
      .from('live_quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single()

    if (!error) {
      setQuizzes(prev => prev.map(q => q.id === quizId ? data : q))
    }
    return { data, error }
  }

  const deleteQuiz = async (quizId) => {
    const { error } = await supabase
      .from('live_quizzes')
      .delete()
      .eq('id', quizId)

    if (!error) {
      setQuizzes(prev => prev.filter(q => q.id !== quizId))
    }
    return { error }
  }

  // Get all responses for a quiz
  const getResponses = async (quizId) => {
    const { data, error } = await supabase
      .from('live_quiz_responses')
      .select('*')
      .eq('quiz_id', quizId)

    return { data: data || [], error }
  }

  // Save evaluation scores for a single response
  const saveEvaluation = async (responseId, scores, totalScore) => {
    const { error } = await supabase
      .from('live_quiz_responses')
      .update({ scores, total_score: totalScore, evaluated: true })
      .eq('id', responseId)

    return { error }
  }

  return {
    quizzes,
    loading,
    createQuiz,
    updateStatus,
    updateQuiz,
    deleteQuiz,
    getResponses,
    saveEvaluation,
    refetch: fetchQuizzes,
  }
}
