import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

function useQueryParams() {
  const location = useLocation()
  return useMemo(() => new URLSearchParams(location.search), [location.search])
}

export default function CheckoutSuccessPage() {
  const query = useQueryParams()
  const sessionId = query.get('session_id') || query.get('sessionId')

  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) || 'https://app.aicoder.guru'
  const continueUrl = sessionId
    ? `${appUrl}/login?checkout=success&session_id=${encodeURIComponent(sessionId)}`
    : `${appUrl}/login?checkout=success`

  return (
    <div className="min-h-screen bg-sand-300 dark:bg-secondary-900 pt-28 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-secondary-700 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-400 to-secondary-500" />

          <div className="p-8 text-center">
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">
              Payment successful
            </h1>
            <p className="mt-3 text-gunmetal-600 dark:text-gray-400">
              Thanks for subscribing. Next, head to the app to sign in (or create an account) and finish setup.
            </p>

            {sessionId && (
              <div className="mt-6 rounded-lg bg-neutral-50 dark:bg-secondary-800 border border-neutral-200 dark:border-secondary-700 p-4 text-left">
                <p className="text-xs font-semibold text-gunmetal-700 dark:text-gray-300 uppercase tracking-wider">
                  Checkout Session
                </p>
                <p className="mt-1 font-mono text-sm text-gunmetal-900 dark:text-white break-all">
                  {sessionId}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={continueUrl}
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
              >
                Continue to the app
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>

              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 border border-neutral-200 dark:border-secondary-600 text-gunmetal-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-neutral-50 dark:hover:bg-secondary-800 transition-colors"
              >
                Back to pricing
              </Link>
            </div>

            <p className="mt-6 text-xs text-gunmetal-500 dark:text-gray-500">
              If you don’t see your plan update right away, it can take a moment for Stripe to confirm the subscription.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

