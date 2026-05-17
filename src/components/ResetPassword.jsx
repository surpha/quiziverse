import { useState } from 'react'
import { supabase } from '../lib/supabase'

function ResetPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/70">
      <div className="relative glass glow-border rounded-2xl p-6 max-w-md w-[90%]">
        <h2 className="text-white text-lg font-orbitron tracking-wider mb-1">Set New Password</h2>
        <p className="text-gray-400 text-sm mb-4">Choose a new password for your account</p>

        {success ? (
          <div className="text-center py-4">
            <p className="text-green-400 text-sm">✓ Password updated successfully!</p>
            <button
              onClick={onDone}
              className="mt-3 px-4 py-2 glass glow-border text-cyan-300 font-orbitron tracking-wider text-sm font-medium rounded-lg cursor-pointer hover:text-white"
            >
              Continue to Quiziverse
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm block mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 glass glow-border text-cyan-300 font-orbitron tracking-wider disabled:opacity-50 font-medium rounded-lg transition-colors cursor-pointer hover:text-white"
            >
              {loading ? '...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
