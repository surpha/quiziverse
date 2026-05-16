import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import localQuestions from '../data/questions.json'

/**
 * Hook to load questions from Supabase (primary) or local JSON (fallback).
 * Returns { questions, loading, error, source }.
 */
export function useQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'supabase' | 'local'

  useEffect(() => {
    async function fetchQuestions() {
      // Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const { data, error: supaError } = await supabase
            .from('questions')
            .select('*')
            .order('id')

          if (supaError) throw supaError

          if (data && data.length > 0) {
            // Transform Supabase rows to match our schema
            const transformed = data.map(row => ({
              id: row.id,
              question: row.question,
              answer: row.answer,
              source: row.source || null,
              imageUrl: row.image_url || null,
              weights: row.weights,
            }))
            setQuestions(transformed)
            setSource('supabase')
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Supabase fetch failed, falling back to local:', err.message)
          setError(err.message)
        }
      }

      // Fallback to local JSON
      setQuestions(localQuestions)
      setSource('local')
      setLoading(false)
    }

    fetchQuestions()
  }, [])

  return { questions, loading, error, source }
}
