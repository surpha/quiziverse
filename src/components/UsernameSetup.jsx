import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [available, setAvailable] = useState(null)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''

  const checkAvailability = async (value) => {
    if (!value || value.length < 3) {
      setAvailable(null)
      return
    }
    setChecking(true)
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .neq('id', user.id)
      .maybeSingle()
    setAvailable(!data)
    setChecking(false)
  }

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20)
    setUsername(val)
    setError(null)
    setAvailable(null)
    // Debounced check
    if (val.length >= 3) {
      const timeout = setTimeout(() => checkAvailability(val), 400)
      return () => clearTimeout(timeout)
    }
  }

  const handleSubmit = async () => {
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (available === false) {
      setError('Username is taken')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Final availability check
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        setError('Username was just taken, try another')
        setSaving(false)
        return
      }

      const updates = { username }
      // Also set display_name from Google if not already set
      if (displayName) {
        updates.display_name = displayName
      }
      // Set avatar from Google if available
      const avatarUrl = user?.user_metadata?.avatar_url
      if (avatarUrl) {
        updates.avatar_url = avatarUrl
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (updateErr) throw new Error(updateErr.message)

      onComplete({ username, display_name: displayName, avatar_url: avatarUrl })
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90">
      <div className="glass glow-border rounded-2xl p-8 max-w-sm w-[90%] text-center">
        <div className="text-4xl mb-4">🌟</div>
        <h2 className="text-white text-xl font-orbitron tracking-wider mb-2">Welcome to Quiziverse!</h2>
        <p className="text-gray-400 text-sm mb-6">Pick a unique username to get started</p>

        {displayName && (
          <p className="text-cyan-300/80 text-xs mb-4">Signed in as <span className="text-white">{displayName}</span></p>
        )}

        <div className="mb-4">
          <div className="flex items-center bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 focus-within:border-cyan-500/50">
            <span className="text-gray-500 text-sm mr-1">@</span>
            <input
              type="text"
              value={username}
              onChange={handleChange}
              onBlur={() => { if (username.length >= 3) checkAvailability(username) }}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none"
              placeholder="your_username"
              autoFocus
            />
            {checking && <span className="text-gray-500 text-xs animate-pulse">...</span>}
            {!checking && available === true && <span className="text-emerald-400 text-sm">✓</span>}
            {!checking && available === false && <span className="text-red-400 text-sm">✗</span>}
          </div>
          {username && username.length < 3 && (
            <p className="text-gray-500 text-xs mt-1 text-left">At least 3 characters</p>
          )}
          {available === false && (
            <p className="text-red-400 text-xs mt-1 text-left">Username already taken</p>
          )}
          {error && <p className="text-red-400 text-xs mt-1 text-left">{error}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || !username || username.length < 3 || available === false}
          className="w-full py-3 bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          {saving ? 'Setting up...' : 'Continue'}
        </button>

        <p className="text-gray-600 text-[10px] mt-3">You can change this later in your profile</p>
      </div>
    </div>
  )
}
