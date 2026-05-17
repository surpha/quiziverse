import { useState } from 'react'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import { supabase } from '../lib/supabase'

const AGE_RANGES = [
  { value: 'under18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45+', label: '45+' },
]

const AVATARS = ['✦', '🌟', '🚀', '🧠', '🎯', '🔮', '⚡', '🌍', '🎨', '🎵', '📚', '🏆', '🦊', '🐉', '🌸', '💎']

function AuthModal({ onClose, onAuth, signIn, signUp, signInWithGoogle }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [step, setStep] = useState(1) // 1: credentials, 2: persona
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [favoriteDomains, setFavoriteDomains] = useState([])
  const [avatarEmoji, setAvatarEmoji] = useState('✦')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const toggleDomain = (domain) => {
    setFavoriteDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setResetSent(true)
        setLoading(false)
        return
      }
      if (mode === 'signin') {
        await signIn(email, password)
        onAuth()
      } else {
        if (step === 1) {
          setStep(2)
          setLoading(false)
          return
        }
        // Step 2 — sign up with profile data
        const profileData = {
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          age_range: ageRange || null,
          favorite_domains: favoriteDomains.length > 0 ? favoriteDomains : [],
          avatar_emoji: avatarEmoji,
        }
        await signUp(email, password, profileData)
        setSignupSuccess(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto relative glass glow-border rounded-2xl p-6 max-w-md w-[90%] max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-orbitron tracking-wider mb-1">
          {mode === 'forgot' ? 'Reset Password' : mode === 'signin' ? 'Sign In' : step === 1 ? 'Create Account' : 'Your Profile'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {mode === 'forgot'
            ? 'Enter your email to receive a reset link'
            : mode === 'signin'
              ? 'Sign in to play, contribute & explore'
              : step === 1
                ? 'Join the Quiziverse community'
                : 'Tell us about yourself'}
        </p>

        {signupSuccess ? (
          <div className="text-center py-4">
            <p className="text-green-400 text-sm">✓ Account created! Check your email to confirm, then sign in.</p>
            <button
              onClick={() => { setMode('signin'); setSignupSuccess(false); setStep(1) }}
              className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        ) : resetSent ? (
          <div className="text-center py-4">
            <p className="text-green-400 text-sm">✓ Reset link sent! Check your email.</p>
            <button
              onClick={() => { setMode('signin'); setResetSent(false) }}
              className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ── Forgot Password Mode ── */}
            {mode === 'forgot' && (
              <div>
                <label className="text-gray-300 text-sm block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
            )}

            {/* ── STEP 1: Credentials ── */}
            {(mode === 'signin' || step === 1) && mode !== 'forgot' && (
              <>
                <div>
                  <label className="text-gray-300 text-sm block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm block mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="••••••••"
                  />
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null) }}
                      className="text-cyan-400 hover:text-cyan-300 text-xs mt-1 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2: Persona (sign-up only) ── */}
            {mode === 'signup' && step === 2 && (
              <>
                {/* Avatar */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Choose an Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatarEmoji(emoji)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer ${
                          avatarEmoji === emoji
                            ? 'glass ring-2 ring-cyan-400 scale-110'
                            : 'bg-gray-800/50 hover:bg-gray-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="text-gray-300 text-sm block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full glass border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    placeholder="How should we call you?"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="text-gray-300 text-sm block mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full glass border border-gray-700/50 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="unique_handle"
                      maxLength={24}
                    />
                  </div>
                </div>

                {/* Age Range */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Age Range</label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_RANGES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAgeRange(value === ageRange ? '' : value)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          ageRange === value
                            ? 'glass text-cyan-300 ring-1 ring-cyan-500/50'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Favorite Domains */}
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Favorite Domains <span className="text-gray-500">(pick any)</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {DOMAIN_KEYS.map(domain => {
                      const { label, color } = DOMAINS[domain]
                      const active = favoriteDomains.includes(domain)
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => toggleDomain(domain)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                            active
                              ? 'text-white ring-1 ring-current'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          style={active ? { backgroundColor: color + '25', color } : {}}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color, opacity: active ? 1 : 0.35 }}
                          />
                          {label.split(' & ')[0]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-500 hover:text-gray-300 text-xs cursor-pointer"
                >
                  ← Back to credentials
                </button>
              </>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 glass glow-border text-cyan-300 font-orbitron tracking-wider disabled:opacity-50 font-medium rounded-lg transition-colors cursor-pointer hover:text-white"
            >
              {loading
                ? '...'
                : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'signin'
                    ? 'Sign In'
                    : step === 1
                      ? 'Next →'
                      : 'Create Account'}
            </button>

            <p className="text-center text-gray-500 text-xs">
              {mode === 'forgot' ? (
                <>Remember your password?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(null) }} className="text-cyan-400 hover:text-cyan-300 cursor-pointer">Sign In</button>
                </>
              ) : mode === 'signin' ? (
                <>Don't have an account?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setStep(1) }} className="text-cyan-400 hover:text-cyan-300 cursor-pointer">Sign Up</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setStep(1) }} className="text-cyan-400 hover:text-cyan-300 cursor-pointer">Sign In</button>
                </>
              )}
            </p>

            {/* Google SSO */}
            {mode !== 'forgot' && (step === 1 || mode === 'signin') && signInWithGoogle && (
              <>
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-gray-700" />
                  <span className="text-gray-500 text-xs">or</span>
                  <div className="flex-1 h-px bg-gray-700" />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null)
                    setLoading(true)
                    try {
                      await signInWithGoogle()
                    } catch (err) {
                      setError(err.message)
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-white/5 border border-gray-600/50 hover:border-gray-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthModal
