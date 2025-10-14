import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'emailLink'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailLinkSent, setEmailLinkSent] = useState(false)

  const { login, signup, loginWithGoogle, sendEmailLink } = useAuth()

  // Sync mode with initialMode when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      // Clear form when modal opens
      setEmail('')
      setPassword('')
      setName('')
      setError('')
    }
  }, [isOpen, initialMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Email link mode only needs email
    if (mode === 'emailLink') {
      if (!email) {
        setError('Please enter your email')
        return
      }

      try {
        setError('')
        setLoading(true)
        await sendEmailLink(email)
        setEmailLinkSent(true)
      } catch (error: any) {
        setError(error.message || 'Failed to send sign-in link')
      } finally {
        setLoading(false)
      }
      return
    }

    // Regular login/signup needs password
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your name')
      return
    }

    try {
      setError('')
      setLoading(true)
      
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(email, password, name)
      }
      
      onClose()
      setEmail('')
      setPassword('')
      setName('')
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      await loginWithGoogle()
      onClose()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    if (mode === 'login') {
      setMode('signup')
    } else if (mode === 'signup') {
      setMode('login')
    } else {
      setMode('login')
    }
    setError('')
    setEmail('')
    setPassword('')
    setName('')
    setEmailLinkSent(false)
  }

  const switchToEmailLink = () => {
    setMode('emailLink')
    setError('')
    setPassword('')
    setName('')
    setEmailLinkSent(false)
  }

  const switchToPassword = () => {
    setMode('login')
    setError('')
    setEmailLinkSent(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gunmetal-900 text-white rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'emailLink' ? 'Sign In with Email Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Email Link Sent Success Message */}
          {emailLinkSent ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gunmetal-900 mb-2">Check your email!</h3>
              <p className="text-sm text-gunmetal-700 mb-6">
                We've sent a sign-in link to <strong>{email}</strong>. Click the link in the email to complete your sign-in.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary-500 text-gunmetal-900 font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Got it
              </button>
            </div>
          ) : (
            <>
              {/* Google Sign In - Only show for non-email-link modes */}
              {mode !== 'emailLink' && (
                <>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl text-gunmetal-900 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gunmetal-700">or</span>
                    </div>
                  </div>
                </>
              )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gunmetal-900 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gunmetal-900 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            {mode !== 'emailLink' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gunmetal-900 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your password"
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            {mode === 'emailLink' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  We'll send you a secure sign-in link. No password required!
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full px-4 py-3 bg-primary-500 text-gunmetal-900 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:bg-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              )}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gunmetal-900" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'emailLink' ? 'Sending Link...' : mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                mode === 'emailLink' ? 'Send Sign-In Link' : mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Email Link Toggle */}
          {mode !== 'emailLink' && (
            <div className="mt-4 text-center">
              <button
                onClick={switchToEmailLink}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Sign in with email link instead
              </button>
            </div>
          )}

          {mode === 'emailLink' && (
            <div className="mt-4 text-center">
              <button
                onClick={switchToPassword}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Use password instead
              </button>
            </div>
          )}

          {/* Switch Mode */}
          {mode !== 'emailLink' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gunmetal-700">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={switchMode}
                  className="ml-1 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 