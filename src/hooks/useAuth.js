import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Hook for Supabase Auth with role support.
 * Returns { user, profile, loading, signIn, signUp, signOut, isAdmin }.
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timed out')), 4000)
      )
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      if (error) {
        console.warn('Profile fetch failed:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.warn('Profile fetch error:', err.message)
      return null
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const p = await fetchProfile(currentUser.id)
        setProfile(p)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true)
        }
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          const p = await fetchProfile(currentUser.id)
          if (p) setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email, password, profileData = {}) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // Update profile with extra fields after trigger creates the row
    const userId = data?.user?.id
    if (userId && Object.keys(profileData).length > 0) {
      // Small delay to let the trigger create the profile row
      await new Promise(r => setTimeout(r, 500))
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
      if (updateError) console.warn('Profile update after signup:', updateError.message)
    }
  }

  const signOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) console.warn('Sign out error:', error.message)
      }
    } catch (err) {
      console.warn('Sign out exception:', err)
    }
    setUser(null)
    setProfile(null)
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    recoveryMode,
    setRecoveryMode,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  }
}
