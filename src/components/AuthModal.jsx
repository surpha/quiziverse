import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import DOMAINS, { DOMAIN_KEYS } from '../utils/domainConfig'
import { cn } from '../lib/utils'

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
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 glass rounded-2xl p-6 shadow-2xl">
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>

          <Dialog.Title className="text-xl font-semibold text-foreground">
            {mode === 'signin' ? 'Sign In' : step === 1 ? 'Create Account' : 'Your Profile'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mt-1">
            {mode === 'signin'
              ? 'Sign in to play, contribute & explore'
              : step === 1
                ? 'Join the Quiziverse community'
                : 'Tell us about yourself'}
          </Dialog.Description>

          {signupSuccess ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-400">✓ Account created! Check your email to confirm, then sign in.</p>
              <button
                onClick={() => { setMode('signin'); setSignupSuccess(false); setStep(1) }}
                className="mt-3 text-sm text-primary hover:text-primary/80"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* ── STEP 1: Credentials ── */}
              {(mode === 'signin' || step === 1) && (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={cn(
                        'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm',
                        'text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
                      )}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className={cn(
                        'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm',
                        'text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
                      )}
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
                    <label className="text-sm font-medium text-foreground mb-2 block">Choose an Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATARS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAvatarEmoji(emoji)}
                          className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all',
                            avatarEmoji === emoji
                              ? 'bg-primary ring-2 ring-primary/50 scale-110'
                              : 'bg-card hover:bg-card border border-border'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={cn(
                        'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm',
                        'text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
                      )}
                      placeholder="How should we call you?"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className={cn(
                          'w-full bg-input border border-border rounded-lg pl-7 pr-3 py-2 text-sm',
                          'text-foreground placeholder:text-muted-foreground',
                          'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
                        )}
                        placeholder="unique_handle"
                        maxLength={24}
                      />
                    </div>
                  </div>

                  {/* Age Range */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Age Range</label>
                    <div className="flex flex-wrap gap-2">
                      {AGE_RANGES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAgeRange(value === ageRange ? '' : value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs transition-colors',
                            ageRange === value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground hover:bg-card border border-border'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Domains */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Favorite Domains <span className="text-muted-foreground">(pick any)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DOMAIN_KEYS.map(domain => {
                        const { label, color } = DOMAINS[domain]
                        const active = favoriteDomains.includes(domain)
                        return (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => toggleDomain(domain)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all',
                              active
                                ? 'text-white ring-1 ring-current'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
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
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Back to credentials
                  </button>
                </>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-2.5 font-medium rounded-lg transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {loading
                  ? '...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : step === 1
                      ? 'Next →'
                      : 'Create Account'}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                {mode === 'signin' ? (
                  <>Don't have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => { setMode('signup'); setStep(1) }} 
                      className="text-primary hover:text-primary/80"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => { setMode('signin'); setStep(1) }} 
                      className="text-primary hover:text-primary/80"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default AuthModal
