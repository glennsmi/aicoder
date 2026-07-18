import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, loginWithGoogle, login, signup, sendEmailLink } = useAuth()
  const { actualTheme, setTheme } = useTheme()
  
  const [mode, setMode] = useState<'login' | 'signup' | 'emailLink'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailLinkSent, setEmailLinkSent] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const redirect = searchParams.get('redirect') || '/'
      navigate(redirect)
    }
  }, [currentUser, navigate, searchParams])

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setLoading(true)
      await loginWithGoogle()
      // Navigation handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        await signup(email, password, displayName)
      } else {
        await login(email, password)
      }
      // Navigation handled by useEffect
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'signup' ? 'sign up' : 'sign in'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await sendEmailLink(email)
      setEmailLinkSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send sign-in link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <a
            href="https://aicoder.guru"
            aria-label="Go to AICoder.Guru website"
            className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded"
          >
            <img
              src={actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
              alt="AICoder.Guru"
              className="mx-auto h-20 mb-16 hover:opacity-90 transition-opacity"
            />
          </a>
          <h2 className="text-3xl font-bold text-neutral-700 dark:text-white">
            {mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
          </h2>
         
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Email Link Sent Confirmation */}
        {emailLinkSent && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              Check your email! We've sent you a sign-in link.
            </p>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8 space-y-6">
          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-neutral-900 dark:text-white font-medium">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-neutral-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-800 text-neutral-900 dark:text-white shadow'
                  : 'text-neutral-600 dark:text-gray-400'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-white dark:bg-gray-800 text-neutral-900 dark:text-white shadow'
                  : 'text-neutral-600 dark:text-gray-400'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('emailLink')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'emailLink'
                  ? 'bg-white dark:bg-gray-800 text-neutral-900 dark:text-white shadow'
                  : 'text-neutral-600 dark:text-gray-400'
              }`}
            >
              Email Link
            </button>
          </div>

          {/* Email Link Form */}
          {mode === 'emailLink' ? (
            <form onSubmit={handleEmailLinkSubmit} className="space-y-4">
              <div>
                <label htmlFor="email-link" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Email address
                </label>
                <input
                  id="email-link"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent bg-white dark:bg-gray-700 text-neutral-900 dark:text-white"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-400 hover:bg-accent-500 text-neutral-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Sign-In Link'}
              </button>
            </form>
          ) : (
            /* Email/Password Form */
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Display name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent bg-white dark:bg-gray-700 text-neutral-900 dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent bg-white dark:bg-gray-700 text-neutral-900 dark:text-white"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent-400 focus:border-transparent bg-white dark:bg-gray-700 text-neutral-900 dark:text-white"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-accent-400 hover:bg-accent-500 text-neutral-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-neutral-500 dark:text-gray-400">
          <p>
            By signing in, you agree to our{' '}
            <a href="https://aicoder.guru/terms" className="text-accent-600 dark:text-accent-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://aicoder.guru/privacy" className="text-accent-600 dark:text-accent-400 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Theme Toggle */}
        <div className="flex justify-center items-center gap-4">
          <a
            href="https://aicoder.guru"
            className="text-sm text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-200 hover:underline transition-colors"
          >
            Back to website
          </a>
          <button
            onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label={actualTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {actualTheme === 'dark' ? (
              <>
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm text-neutral-900 dark:text-white font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 text-secondary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="text-sm text-neutral-900 dark:text-white font-medium">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
