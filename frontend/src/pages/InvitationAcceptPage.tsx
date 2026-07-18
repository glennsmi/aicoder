import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function InvitationAcceptPage() {
  const { currentUser, user, loading, logout } = useAuth()
  const { actualTheme } = useTheme()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const invitationId = searchParams.get('invitationId') || ''
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const lastAttemptKeyRef = useRef<string>('') // prevent duplicate accepts across re-renders
  const didNavigateRef = useRef(false)
  const [isSlow, setIsSlow] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)

  const formatError = (e: any): string => {
    const code = e?.code || e?.details?.code
    const msg = e?.message || e?.details?.message || String(e)
    if (code) return `${code}: ${msg}`
    return msg
  }

  const loginUrl = useMemo(() => {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return `/login?redirect=${redirect}`
  }, [location.pathname, location.search])

  useEffect(() => {
    let cancelled = false

    async function accept() {
      if (!currentUser || loading) return
      if (!invitationId || !token) return
      const attemptKey = `${currentUser.uid}:${invitationId}:${token}`
      if (lastAttemptKeyRef.current === attemptKey) return
      lastAttemptKeyRef.current = attemptKey

      setStatus('accepting')
      setError(null)
      setIsSlow(false)

      try {
        const fn = httpsCallable(functions, 'acceptInvitationByToken')
        const timeoutMs = 30000
        let timeoutId: number | undefined
        await Promise.race([
          fn({ invitationId, token }),
          new Promise((_, reject) => {
            timeoutId = window.setTimeout(
              () => reject(new Error('Timed out while accepting invitation. Please try again.')),
              timeoutMs
            )
          }),
        ]).finally(() => {
          if (timeoutId) window.clearTimeout(timeoutId)
        })

        if (cancelled) return
        setStatus('accepted')
      } catch (e: any) {
        if (cancelled) return
        lastAttemptKeyRef.current = '' // allow retry
        setStatus('error')
        setError(formatError(e) || 'Failed to accept invitation')
      }
    }

    accept()
    return () => {
      cancelled = true
    }
  }, [currentUser, loading, invitationId, token, navigate, retryNonce])

  // Mark "slow" if we sit on accepting for a while (gives user an escape hatch).
  useEffect(() => {
    if (status !== 'accepting') {
      setIsSlow(false)
      return
    }
    const id = window.setTimeout(() => setIsSlow(true), 5000)
    return () => window.clearTimeout(id)
  }, [status])

  // If the user doc updates with an orgId at any time, enter the app automatically.
  // This covers cases where the callable succeeds server-side but the client is still "accepting".
  useEffect(() => {
    if (didNavigateRef.current) return
    if (!currentUser || loading) return
    if (!user?.organizationId) return
    didNavigateRef.current = true
    navigate('/', { replace: true })
  }, [currentUser, loading, user?.organizationId, navigate])

  // Redirect once Firestore user/org state has caught up (with a fallback timeout).
  useEffect(() => {
    if (didNavigateRef.current) return
    if (status !== 'accepted') return

    // Best signal that the invite "took" on the client: user doc got organizationId.
    const hasOrg = Boolean(user?.organizationId)
    if (hasOrg) {
      didNavigateRef.current = true
      navigate('/', { replace: true })
      return
    }

    const fallbackId = window.setTimeout(() => {
      if (didNavigateRef.current) return
      didNavigateRef.current = true
      navigate('/', { replace: true })
    }, 8000)

    return () => window.clearTimeout(fallbackId)
  }, [status, user?.organizationId, navigate])

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
        <p className="text-xs text-gunmetal-600 dark:text-gray-400 mb-4">
          Signed in as <span className="font-medium">{currentUser.email || 'unknown email'}</span>
        </p>

        {status === 'accepting' && (
          <div className="flex items-center gap-3 text-sm text-gunmetal-600 dark:text-gray-300">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-400"></div>
            <span>Joining your organization</span>
          </div>
        )}

        {status === 'accepted' && (
          <p className="text-sm text-green-700 dark:text-green-300">Invitation accepted. Redirecting…</p>
        )}

        {status === 'accepting' && isSlow && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This is taking longer than expected. You can retry, or sign out and try a different email.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  lastAttemptKeyRef.current = ''
                  setIsSlow(false)
                  setStatus('idle')
                  setRetryNonce((n) => n + 1)
                }}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={async () => {
                  try {
                    await logout()
                  } finally {
                    window.location.href = loginUrl
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error || 'Failed to accept invitation'}</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  lastAttemptKeyRef.current = ''
                  setIsSlow(false)
                  setStatus('idle')
                  setError(null)
                  setRetryNonce((n) => n + 1)
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={async () => {
                  try {
                    await logout()
                  } finally {
                    window.location.href = loginUrl
                  }
                }}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
              >
                Sign out & try another email
              </button>
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

