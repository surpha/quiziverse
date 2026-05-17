import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import localQuestions from '../data/questions.json'

/**
 * Hook to load questions from Supabase (primary) or local JSON (fallback).
 * Returns { questions, loading, error, source, refetch }.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'supabase' | 'local'

  const fetchQuestions = useCallback(async () => {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        // Race the query against a timeout to avoid hanging on RLS issues
        const queryPromise = supabase
          .from('questions')
          .select('*')
          .eq('status', 'approved')
          .order('id')

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timed out')), 10000)
        )

        const { data, error: supaError } = await Promise.race([queryPromise, timeoutPromise])

        if (supaError) throw supaError

        // Transform Supabase rows to match our schema
        const transformed = (data || []).map(row => ({
          id: row.id,
          question: row.question,
          answer: row.answer,
          source: row.source || null,
          imageUrl: row.image_url || null,
          mediaUrl: row.media_url || null,
          difficulty: row.difficulty || 5,
          type: row.type || 'straight',
          hints: row.hints || null,
          weights: row.weights,
        }))
        setQuestions(transformed.length > 0 ? transformed : localQuestions)
        setSource(transformed.length > 0 ? 'supabase' : 'local')
        setLoading(false)
        return
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local:', err.message)
        setError(err.message)
      }
    }

    // Fallback to local JSON
    setQuestions(localQuestions)
    setSource('local')
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  return { questions, loading, error, source, refetch: fetchQuestions }
}
