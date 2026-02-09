import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { useDeveloper } from '../contexts/DeveloperContext'
import TierOverrideSelector from '../components/TierOverrideSelector'
import CreateStripeCustomerButton from '../components/CreateStripeCustomerButton'
import CustomerPortalButton from '../components/CustomerPortalButton'
import { PRICING_TIERS } from '@shared'

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


export default function BillingPage() {
  const navigate = useNavigate()
  const { organization } = useOrganization()
  const { user } = useAuth()
  const { testMode } = useDeveloper()
  const [showPricingTable, setShowPricingTable] = useState(false)

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

              {/* Action Buttons */}
              <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-secondary-700 flex flex-col sm:flex-row gap-3">
                {!isPaidTier ? (
                  <button
                    onClick={handleUpgradeClick}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Upgrade Plan
                  </button>
                ) : (
                  <>
                    <CustomerPortalButton
                      className="flex-1"
                      variant="primary"
                    />
                    <button
                      onClick={handleUpgradeClick}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 border border-neutral-200 dark:border-secondary-600 text-gunmetal-900 dark:text-white font-semibold rounded-lg hover:bg-neutral-50 dark:hover:bg-secondary-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Change Plan
                    </button>
                  </>
                )}
                {organization && (
                  <button
                    onClick={() => navigate('/organization-settings')}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 text-gunmetal-600 dark:text-gray-400 font-medium rounded-lg hover:bg-neutral-50 dark:hover:bg-secondary-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Org Settings
                  </button>
                )}
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
                    {pricingTier.dataRetentionDays === -1 ? 'Unlimited' : `${pricingTier.dataRetentionDays} days`}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: pricingTier.dataRetentionDays === -1 ? '100%' : '30%' }}
                  />
                </div>
              </div>

              {/* API Integrations */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gunmetal-600 dark:text-gray-400">API Integrations</span>
                  <span className="font-semibold text-gunmetal-900 dark:text-white">
                    {pricingTier.features.find(f => f.id === 'api_integration')?.included ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${pricingTier.features.find(f => f.id === 'api_integration')?.included
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
                    {pricingTier.maxUsers === null ? 'Unlimited' : pricingTier.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-secondary-700 rounded-full h-2">
                  <div
                    className="bg-secondary-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: pricingTier.maxUsers === null ? '100%' : '20%' }}
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

          {/* Quick Actions for paid users */}
          {isPaidTier && (
            <div className="bg-white dark:bg-secondary-900 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <CustomerPortalButton
                  className="w-full justify-center"
                  variant="outline"
                  size="sm"
                />
                <button
                  onClick={handleUpgradeClick}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-neutral-200 dark:border-secondary-600 text-gunmetal-700 dark:text-gray-300 font-medium rounded-lg hover:bg-neutral-50 dark:hover:bg-secondary-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Change Plan
                </button>
              </div>
            </div>
          )}
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
