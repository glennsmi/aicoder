import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { useDeveloper } from '../contexts/DeveloperContext'
import TierOverrideSelector from '../components/TierOverrideSelector'
import CreateStripeCustomerButton from '../components/CreateStripeCustomerButton'
import CustomerPortalButton from '../components/CustomerPortalButton'
import { PRICING_TIERS } from '@shared'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../config/firebaseApp'
import { collection, getDocs, query as fsQuery, where } from 'firebase/firestore'

// Define tier mapping based on Stripe integration plan
const TIER_MAPPING = {
  'free_individual': 'free',
  'paid_individual': 'free', // Individual paid users still use free org tier
  'team': 'team',
  'enterprise': 'enterprise'
} as const

const TIER_DISPLAY_NAMES: Record<string, string> = {
  'free_individual': 'Novice',
  'paid_individual': 'Apprentice',
  'team': 'Sensei / Master',
  'enterprise': 'Grandmaster'
}

const TIER_SUBTITLES: Record<string, string> = {
  'free_individual': 'Free Individual',
  'paid_individual': 'Paid Individual',
  'team': 'Team Plan',
  'enterprise': 'Enterprise Plan'
}

const TIER_DESCRIPTIONS: Record<string, string> = {
  'free_individual': 'Perfect for solo developers getting started with AI coding cost tracking',
  'paid_individual': 'Enhanced features for solo developers with API integrations',
  'team': 'For teams collaborating with AI coding assistants',
  'enterprise': 'For large organizations with advanced needs'
}

const INTERNAL_TIER_LIMITS: Record<string, { dataRetentionDays: number; apiIntegrations: number | 'unlimited'; maxUsers: number | null }> = {
  free_individual: { dataRetentionDays: 90, apiIntegrations: 0, maxUsers: 1 },
  paid_individual: { dataRetentionDays: 90, apiIntegrations: 0, maxUsers: 1 },
  team_apprentice: { dataRetentionDays: 90, apiIntegrations: 0, maxUsers: 1 },
  team_sensei: { dataRetentionDays: 180, apiIntegrations: 1, maxUsers: 10 },
  team_master: { dataRetentionDays: 365, apiIntegrations: 3, maxUsers: 30 },
  enterprise: { dataRetentionDays: -1, apiIntegrations: 'unlimited', maxUsers: null },
}

type ActiveSubscriptionSnapshot = {
  internalTier?: string
  planMetadata?: Record<string, unknown>
}

function toMillisSafe(value: any): number {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}


export default function BillingPage() {
  const location = useLocation()
  const { organization } = useOrganization()
  const { user } = useAuth()
  const { testMode } = useDeveloper()
  const [showPricingTable, setShowPricingTable] = useState(false)
  const [stripeSyncStatus, setStripeSyncStatus] = useState<
    | { state: 'idle' }
    | { state: 'syncing' }
    | { state: 'done'; message: string }
    | { state: 'error'; message: string }
  >({ state: 'idle' })
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscriptionSnapshot | null>(null)

  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const checkoutSessionId = query.get('session_id')
  const checkoutSuccess = query.get('success') === 'true' || query.get('checkout') === 'success'
  const attemptedSyncRef = useRef<string | null>(null)

  // Determine current tier and features
  const currentTier = user?.tier || 'free_individual'
  const orgTier = TIER_MAPPING[currentTier as keyof typeof TIER_MAPPING] || 'free'
  const pricingTier = PRICING_TIERS[orgTier]
  const isPaidTier = currentTier !== 'free_individual'

  // Debug logging
  useEffect(() => {
    console.log('BillingPage tier update:', {
      userTier: user?.tier,
      currentTier,
      orgTier,
      pricingTier: pricingTier?.name,
      isPaidTier,
      organizationTier: organization?.tier
    })
  }, [user?.tier, currentTier, orgTier, pricingTier, isPaidTier, organization?.tier])

  // After returning from Stripe Checkout, manually sync the subscription as a fallback.
  // This helps when Stripe webhooks are delayed or misconfigured.
  useEffect(() => {
    if (!user) return
    if (!checkoutSuccess || !checkoutSessionId) return

    if (attemptedSyncRef.current === checkoutSessionId) return
    attemptedSyncRef.current = checkoutSessionId

    const run = async () => {
      try {
        setStripeSyncStatus({ state: 'syncing' })

        const syncFn = httpsCallable(functions, 'syncStripeCheckoutSession')
        const result = await syncFn({ sessionId: checkoutSessionId })
        const data = result.data as any

        if (data?.success) {
          setStripeSyncStatus({
            state: 'done',
            message: `Subscription synced (${data.userTier || data.internalTier || 'updated'}).`
          })
        } else {
          setStripeSyncStatus({
            state: 'error',
            message: 'Could not sync subscription. Please refresh and try again.'
          })
        }
      } catch (e: any) {
        setStripeSyncStatus({
          state: 'error',
          message: e?.message || 'Failed to sync subscription.'
        })
      }
    }

    run()
  }, [user, checkoutSuccess, checkoutSessionId])

  // Fetch the active subscription so the sidebar reflects Stripe sub-plan limits
  // (Sensei vs Master), not only the coarse app-level "team" tier defaults.
  useEffect(() => {
    if (!user) {
      setActiveSubscription(null)
      return
    }

    const run = async () => {
      try {
        const subscriptionsRef = collection(db, 'subscriptions')
        const subQuery = organization?.id
          ? fsQuery(subscriptionsRef, where('organizationId', '==', organization.id))
          : fsQuery(subscriptionsRef, where('userId', '==', user.id))

        const snapshot = await getDocs(subQuery)

        const activeStatuses = new Set(['active', 'trialing', 'past_due'])
        const docs = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
          .filter((sub: any) => activeStatuses.has(String(sub.status || '')))
          .sort((a: any, b: any) => {
            const aTs = toMillisSafe(a.updatedAt) || toMillisSafe(a.currentPeriodEnd)
            const bTs = toMillisSafe(b.updatedAt) || toMillisSafe(b.currentPeriodEnd)
            return bTs - aTs
          })

        if (docs.length > 0) {
          const current = docs[0] as any
          setActiveSubscription({
            internalTier: current.internalTier || current.tier,
            planMetadata: current.planMetadata || current.priceMetadata || undefined
          })
        } else {
          setActiveSubscription(null)
        }
      } catch (error) {
        console.warn('Failed to fetch active subscription for billing sidebar:', error)
        setActiveSubscription(null)
      }
    }

    run()
  }, [user?.id, organization?.id, stripeSyncStatus.state])

  const usageMetrics = useMemo(() => {
    // Base fallback from existing static pricing tiers.
    const fallbackApiEnabled = pricingTier.features.find(f => f.id === 'api_integration')?.included
    const fallback = {
      dataRetentionDays: pricingTier.dataRetentionDays,
      apiIntegrations: fallbackApiEnabled ? 1 : 0,
      maxUsers: pricingTier.maxUsers,
    }

    if (!activeSubscription) return fallback

    const fromInternalTier = activeSubscription.internalTier
      ? INTERNAL_TIER_LIMITS[activeSubscription.internalTier]
      : undefined

    const meta = activeSubscription.planMetadata || {}
    const metaDataRetention = parseOptionalNumber(meta.dataRetentionDays)
    const metaMaxUsersRaw = meta.maxUsers
    const metaMaxUsers = typeof metaMaxUsersRaw === 'string' && metaMaxUsersRaw.trim().toLowerCase() === 'unlimited'
      ? null
      : parseOptionalNumber(metaMaxUsersRaw)
    const metaApiRaw = meta.apiIntegrations
    const metaApiIntegrations: number | 'unlimited' | undefined =
      typeof metaApiRaw === 'string' && metaApiRaw.trim().toLowerCase() === 'unlimited'
        ? 'unlimited'
        : parseOptionalNumber(metaApiRaw)

    return {
      dataRetentionDays: metaDataRetention ?? fromInternalTier?.dataRetentionDays ?? fallback.dataRetentionDays,
      apiIntegrations: metaApiIntegrations ?? fromInternalTier?.apiIntegrations ?? fallback.apiIntegrations,
      maxUsers: metaMaxUsers ?? fromInternalTier?.maxUsers ?? fallback.maxUsers,
    }
  }, [activeSubscription, pricingTier])

  // Tier updating animation
  const [tierUpdating, setTierUpdating] = useState(false)
  useEffect(() => {
    if (user?.tier) {
      setTierUpdating(true)
      const timer = setTimeout(() => setTierUpdating(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [user?.tier])

  // Load Stripe Pricing Table script
  useEffect(() => {
    if (showPricingTable) {
      const script = document.createElement('script')
      script.src = 'https://js.stripe.com/v3/pricing-table.js'
      script.async = true
      document.body.appendChild(script)
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [showPricingTable])

  const handleUpgradeClick = () => {
    setShowPricingTable(true)
    // Scroll to pricing table after a short delay
    setTimeout(() => {
      document.getElementById('pricing-table-section')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {stripeSyncStatus.state !== 'idle' && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
          stripeSyncStatus.state === 'syncing'
            ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-200'
            : stripeSyncStatus.state === 'done'
              ? 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-900/40 dark:bg-accent-900/20 dark:text-accent-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
        }`}>
          {stripeSyncStatus.state === 'syncing' ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Syncing your subscription from Stripe…
            </div>
          ) : (
            <span>
              {stripeSyncStatus.message}{' '}
              <button
                onClick={() => window.location.reload()}
                className="underline font-medium"
              >
                Refresh
              </button>
            </span>
          )}
        </div>
      )}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          Manage your plan, subscription, and billing information
        </p>
      </div>

      {/* Development Tier Override - Only visible in test mode */}
      {testMode && (
        <div className="mb-8 space-y-4">
          <TierOverrideSelector />
          <CreateStripeCustomerButton />
        </div>
      )}

      {/* Current Plan Overview + Usage Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Plan Card */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-neutral-200 dark:border-secondary-700 overflow-hidden">
            {/* Accent bar at top */}
            <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-400 to-secondary-500" />

            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gunmetal-900 dark:text-white">
                      {TIER_DISPLAY_NAMES[currentTier] || 'Novice'}
                    </h2>
                    {tierUpdating && (
                      <div className="flex items-center gap-1 text-sm text-primary-500">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gunmetal-500 dark:text-gray-400 mt-0.5">
                    {TIER_SUBTITLES[currentTier] || 'Free Individual'}
                  </p>
                  {organization && (
                    <p className="text-sm text-gunmetal-600 dark:text-gray-400 mt-2">
                      Organization: <span className="font-medium">{organization.name}</span>
                    </p>
                  )}
                  <p className="text-sm text-gunmetal-500 dark:text-gray-500 mt-1.5 max-w-md">
                    {TIER_DESCRIPTIONS[currentTier]}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${isPaidTier
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isPaidTier ? 'bg-accent-400' : 'bg-primary-500'}`} />
                    {isPaidTier ? 'Active' : 'Free'}
                  </span>
                </div>
              </div>

              {/* Features Grid */}
              <div className="border-t border-neutral-200 dark:border-secondary-700 pt-5">
                <h3 className="text-sm font-semibold text-gunmetal-900 dark:text-white mb-3 uppercase tracking-wider">
                  Plan Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {pricingTier.features.map((feature) => (
                    <div key={feature.id} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-neutral-200 dark:text-secondary-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div>
                        <p className={`text-sm font-medium ${feature.included
                          ? 'text-gunmetal-900 dark:text-white'
                          : 'text-neutral-500 dark:text-gray-500'
                          }`}>
                          {feature.name}
                        </p>
                        <p className={`text-xs ${feature.included
                          ? 'text-gunmetal-500 dark:text-gray-400'
                          : 'text-neutral-500 dark:text-gray-600'
                          }`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right sidebar: Usage + Support */}
        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
              Usage This Month
            </h2>
            <div className="space-y-5">
              {/* Data Retention */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gunmetal-600 dark:text-gray-400">Data Retention</span>
                  <span className="font-semibold text-gunmetal-900 dark:text-white">
                    {usageMetrics.dataRetentionDays === -1 ? 'Unlimited' : `${usageMetrics.dataRetentionDays} days`}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: usageMetrics.dataRetentionDays === -1 ? '100%' : '30%' }}
                  />
                </div>
              </div>

              {/* API Integrations */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gunmetal-600 dark:text-gray-400">API Integrations</span>
                  <span className="font-semibold text-gunmetal-900 dark:text-white">
                    {usageMetrics.apiIntegrations === 'unlimited'
                      ? 'Unlimited'
                      : usageMetrics.apiIntegrations > 0
                        ? usageMetrics.apiIntegrations
                        : 'Disabled'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${usageMetrics.apiIntegrations === 'unlimited' || usageMetrics.apiIntegrations > 0
                      ? 'bg-accent-400'
                      : 'bg-neutral-200 dark:bg-secondary-700'
                      }`}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gunmetal-600 dark:text-gray-400">Team Members</span>
                  <span className="font-semibold text-gunmetal-900 dark:text-white">
                    {usageMetrics.maxUsers === null ? 'Unlimited' : usageMetrics.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className="bg-secondary-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: usageMetrics.maxUsers === null ? '100%' : '20%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
              Support
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${pricingTier.support === 'dedicated' ? 'bg-accent-400' :
                  pricingTier.support === 'priority' ? 'bg-primary-500' :
                    pricingTier.support === 'email' ? 'bg-secondary-400' : 'bg-neutral-500'
                  }`} />
                <span className="text-sm font-medium text-gunmetal-900 dark:text-white capitalize">
                  {pricingTier.support} Support
                </span>
              </div>
              <p className="text-sm text-gunmetal-500 dark:text-gray-400">
                {pricingTier.support === 'dedicated' && 'Personal support contact and SLA guarantee'}
                {pricingTier.support === 'priority' && 'Email support with priority response'}
                {pricingTier.support === 'email' && 'Standard email support'}
                {pricingTier.support === 'community' && 'Community support and documentation'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Upgrade / Change Plan Section */}
      <div className="mb-8">
        <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-neutral-200 dark:border-secondary-700 overflow-hidden">
          {/* Section header with toggle */}
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gunmetal-900 dark:text-white">
                {isPaidTier ? 'Upgrade or Change Plan' : 'Upgrade Your Plan'}
              </h2>
              <p className="text-sm text-gunmetal-500 dark:text-gray-400 mt-1">
                {isPaidTier
                  ? 'View available plans or manage your current subscription via Stripe'
                  : 'Unlock API integrations, team features, and advanced analytics'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isPaidTier && (
                <CustomerPortalButton
                  variant="outline"
                  size="sm"
                  label="Manage in Stripe"
                />
              )}
              {!showPricingTable ? (
                <button
                  onClick={handleUpgradeClick}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  View Plans & Pricing
                </button>
              ) : (
                <button
                  onClick={() => setShowPricingTable(false)}
                  className="p-2 text-gunmetal-400 hover:text-gunmetal-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-secondary-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Stripe Pricing Table (shown on click) */}
          {showPricingTable && (
            <div id="pricing-table-section" className="px-6 pb-6 border-t border-neutral-200 dark:border-secondary-700 pt-6">
              <stripe-pricing-table
                pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
                publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1"
                customer-email={user?.email}
                client-reference-id={user?.id ? `user:${user.id}` : undefined}
              />
              <p className="text-xs text-center text-gunmetal-500 dark:text-gray-500 mt-4">
                All pricing and billing is managed securely through Stripe. Cancel anytime.
                {isPaidTier && ' To downgrade, click "Manage in Stripe" above.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-neutral-200 dark:border-secondary-700 overflow-hidden">
        <div className="p-6 border-b border-neutral-200 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gunmetal-900 dark:text-white">
              Billing History
            </h2>
            {isPaidTier && (
              <CustomerPortalButton
                variant="outline"
                size="sm"
              />
            )}
          </div>
        </div>
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-neutral-50 dark:bg-secondary-800 flex items-center justify-center">
            <svg className="w-7 h-7 text-neutral-500 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gunmetal-700 dark:text-gray-300 font-medium">No invoices yet</p>
          <p className="text-sm text-gunmetal-500 dark:text-gray-500 mt-1 max-w-sm mx-auto">
            {isPaidTier
              ? 'Your billing history will appear here after your first payment. You can also view invoices in the Stripe portal.'
              : 'Subscribe to a paid plan to see your billing history here.'}
          </p>
        </div>
      </div>
    </div>
  )
}
