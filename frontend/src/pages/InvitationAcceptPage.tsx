import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function InvitationAcceptPage() {
  const { currentUser, loading } = useAuth()
  const { actualTheme } = useTheme()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const invitationId = searchParams.get('invitationId') || ''
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const loginUrl = useMemo(() => {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return `/login?redirect=${redirect}`
  }, [location.pathname, location.search])

  useEffect(() => {
    let cancelled = false

    async function accept() {
      if (!currentUser || loading) return
      if (!invitationId || !token) return
      if (status === 'accepting' || status === 'accepted') return

      setStatus('accepting')
      setError(null)

      try {
        const fn = httpsCallable(functions, 'acceptInvitationByToken')
        await fn({ invitationId, token })

        if (cancelled) return
        setStatus('accepted')

        // Give Firestore listeners a moment to refresh user/org state.
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 500)
      } catch (e: any) {
        if (cancelled) return
        setStatus('error')
        setError(e?.message || 'Failed to accept invitation')
      }
    }

    accept()
    return () => {
      cancelled = true
    }
  }, [currentUser, loading, invitationId, token, navigate, status])

  const logoSrc = actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'

  if (!invitationId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-800 py-12 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
          <img src={logoSrc} alt="AICoder.Guru" className="mx-auto h-16 mb-8" />
          <h1 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-2">Invalid invitation link</h1>
          <p className="text-sm text-gunmetal-600 dark:text-gray-300">
            This link is missing required information. Ask your admin to resend the invitation.
          </p>
          <div className="mt-6">
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Go to sign in
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-800 py-12 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
          <img src={logoSrc} alt="AICoder.Guru" className="mx-auto h-16 mb-8" />
          <h1 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-2">Accept invitation</h1>
          <p className="text-sm text-gunmetal-600 dark:text-gray-300">
            Sign in (or create an account) with the invited email address to join the organization.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={loginUrl}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Sign in / Sign up
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-secondary-800 py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        <img src={logoSrc} alt="AICoder.Guru" className="mx-auto h-16 mb-8" />
        <h1 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-2">Accepting invitation…</h1>

        {status === 'accepting' && (
          <div className="flex items-center gap-3 text-sm text-gunmetal-600 dark:text-gray-300">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-400"></div>
            <span>Joining your organization</span>
          </div>
        )}

        {status === 'accepted' && (
          <p className="text-sm text-green-700 dark:text-green-300">Invitation accepted. Redirecting…</p>
        )}

        {status === 'error' && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error || 'Failed to accept invitation'}</p>
            <div className="mt-4 flex gap-3">
              <a
                href={loginUrl}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Try again
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

