import { useState } from 'react'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'

const AGE_RANGES = [
  { value: 'under18', label: 'Under 18' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45+', label: '45+' },
]

const AVATARS = ['✦', '🌟', '🚀', '🧠', '🎯', '🔮', '⚡', '🌍', '🎨', '🎵', '📚', '🏆', '🦊', '🐉', '🌸', '💎']

function AuthModal({ onClose, onAuth, signIn, signUp }) {
  const [mode, setMode] = useState('signin')
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
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-md w-[90%] shadow-2xl shadow-purple-500/20 backdrop-blur-sm max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-semibold mb-1">
          {mode === 'signin' ? 'Sign In' : step === 1 ? 'Create Account' : 'Your Profile'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {mode === 'signin'
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
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ── STEP 1: Credentials ── */}
            {(mode === 'signin' || step === 1) && (
              <>
                <div>
                  <label className="text-gray-300 text-sm block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="••••••••"
                  />
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
                            ? 'bg-purple-600 ring-2 ring-purple-400 scale-110'
                            : 'bg-gray-800 hover:bg-gray-700'
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
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
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
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading
                ? '...'
                : mode === 'signin'
                  ? 'Sign In'
                  : step === 1
                    ? 'Next →'
                    : 'Create Account'}
            </button>

            <p className="text-center text-gray-500 text-xs">
              {mode === 'signin' ? (
                <>Don't have an account?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setStep(1) }} className="text-purple-400 hover:text-purple-300 cursor-pointer">Sign Up</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setStep(1) }} className="text-purple-400 hover:text-purple-300 cursor-pointer">Sign In</button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthModal
