import { useState } from 'react'

function AuthModal({ onClose, onAuth, signIn, signUp }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
        onAuth()
      } else {
        await signUp(email, password)
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
      <div className="pointer-events-auto relative bg-gray-900/95 border border-purple-500/40 rounded-2xl p-6 max-w-sm w-[90%] shadow-2xl shadow-purple-500/20 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none cursor-pointer"
        >
          &times;
        </button>

        <h2 className="text-white text-lg font-semibold mb-1">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {mode === 'signin' ? 'Sign in to contribute & access admin tools' : 'Join the Quiziverse community'}
        </p>

        {signupSuccess ? (
          <div className="text-center py-4">
            <p className="text-green-400 text-sm">✓ Account created! Check your email to confirm, then sign in.</p>
            <button
              onClick={() => { setMode('signin'); setSignupSuccess(false) }}
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm cursor-pointer"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
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

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>

            <p className="text-center text-gray-500 text-xs">
              {mode === 'signin' ? (
                <>Don't have an account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-purple-400 hover:text-purple-300 cursor-pointer">Sign Up</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => setMode('signin')} className="text-purple-400 hover:text-purple-300 cursor-pointer">Sign In</button>
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
