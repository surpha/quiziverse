import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for managing answer disputes.
 * Users can raise disputes; admins can fetch all pending and resolve them.
 */
export function useDisputes(userId, isAdmin = false) {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch disputes (user's own, or all pending for admin)
  const fetchDisputes = useCallback(async () => {
    if (!supabase || !userId) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('disputes').select('*')

      if (isAdmin) {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.eq('user_id', userId).order('created_at', { ascending: false })
      }

      const { data, error: err } = await query
      if (err) throw err
      setDisputes(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, isAdmin])

  // User raises a dispute
  const raiseDispute = useCallback(async ({ questionId, questionText, correctAnswer, userAnswer, llmVerdict, userReason }) => {
    if (!supabase || !userId) return { error: 'Not authenticated' }

    const { data, error: err } = await supabase
      .from('disputes')
      .insert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        correct_answer: correctAnswer,
        user_answer: userAnswer,
        llm_verdict: llmVerdict,
        user_reason: userReason || null,
      })
      .select()
      .single()

    if (err) return { error: err.message }
    return { data }
  }, [userId])

  // Admin resolves a dispute (approve or reject)
  const resolveDispute = useCallback(async (disputeId, resolution, adminNote = null) => {
    if (!supabase || !isAdmin) return { error: 'Not authorized' }

    const { error: err } = await supabase
      .from('disputes')
      .update({
        status: resolution, // 'approved' or 'rejected'
        admin_note: adminNote,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', disputeId)

    if (err) return { error: err.message }

    // If approved, update the user's attempt to 'correct'
    if (resolution === 'approved') {
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) {
        const dailyMatch = dispute.question_id.match(/^daily-(.+)-(\d+)$/)
        if (dailyMatch) {
          const [, challengeId, qIndex] = dailyMatch
          const questionIndex = parseInt(qIndex)
          const { data: attempt } = await supabase
            .from('daily_attempts')
            .select('id, answers, total_score')
            .eq('user_id', dispute.user_id)
            .eq('challenge_id', challengeId)
            .single()

          if (attempt && attempt.answers) {
            const answers = [...attempt.answers]
            const answerIdx = answers.findIndex(a => a.question_index === questionIndex)
            if (answerIdx !== -1) {
              const oldScore = answers[answerIdx].score || 0
              const maxScore = 10
              answers[answerIdx] = { ...answers[answerIdx], verdict: 'correct', score: maxScore }
              await supabase.from('daily_attempts').update({
                answers,
                total_score: (attempt.total_score || 0) + (maxScore - oldScore),
              }).eq('id', attempt.id)
            }
          }
        } else {
          await supabase
            .from('play_attempts')
            .update({ verdict: 'correct' })
            .eq('user_id', dispute.user_id)
            .eq('question_id', dispute.question_id)
        }

        // Send notification to user
        await supabase.from('notifications').insert({
          user_id: dispute.user_id,
          type: 'dispute_approved',
          title: 'Dispute Approved ✓',
          message: `Your answer "${dispute.user_answer}" for "${dispute.question_text.slice(0, 60)}..." has been marked correct!`,
          metadata: { dispute_id: disputeId, question_id: dispute.question_id },
        })
      }
    } else {
      // Send rejection notification
      const dispute = disputes.find(d => d.id === disputeId)
      if (dispute) {
        await supabase.from('notifications').insert({
          user_id: dispute.user_id,
          type: 'dispute_rejected',
          title: 'Dispute Reviewed',
          message: `Your dispute for "${dispute.question_text.slice(0, 60)}..." was reviewed. ${adminNote || 'The original verdict stands.'}`,
          metadata: { dispute_id: disputeId, question_id: dispute.question_id },
        })
      }
    }

    // Refresh disputes list
    await fetchDisputes()
    return { success: true }
  }, [userId, isAdmin, disputes, fetchDisputes])

  return { disputes, loading, error, fetchDisputes, raiseDispute, resolveDispute }
}
