import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function CompleteEmailSignInPage() {
  const { completeEmailLinkSignIn, isEmailLinkSignIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)

  useEffect(() => {
    // Check if this is an email link sign-in
    if (!isEmailLinkSignIn()) {
      navigate('/')
      return
    }

    // Try to get email from localStorage
    const savedEmail = window.localStorage.getItem('emailForSignIn')
    
    if (savedEmail) {
      // Automatically complete sign-in
      handleSignIn(savedEmail)
    } else {
      // Need to ask for email
      setNeedsEmail(true)
    }
  }, [])

  const handleSignIn = async (emailToUse: string) => {
    setLoading(true)
    setError('')

    try {
      await completeEmailLinkSignIn(emailToUse)
      // Redirect to home page on success
      navigate('/')
    } catch (err: any) {
      console.error('Error completing sign-in:', err)
      setError(err.message || 'Failed to complete sign-in. Please try again.')
      setNeedsEmail(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      handleSignIn(email)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Completing sign-in...</p>
        </div>
      </div>
    )
  }

  if (needsEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Complete Sign-In
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please confirm your email address to complete the sign-in process.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Complete Sign-In
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                Cancel and return home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

