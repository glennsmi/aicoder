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

const TIER_DISPLAY_NAMES = {
  'free_individual': 'Novice (Free Individual)',
  'paid_individual': 'Apprentice (Paid Individual)',
  'team': 'Sensei/Master (Team)',
  'enterprise': 'Grandmaster (Enterprise)'
} as const

const TIER_DESCRIPTIONS = {
  'free_individual': 'Perfect for solo developers tracking their AI coding costs',
  'paid_individual': 'Enhanced features for solo developers with API integrations',
  'team': 'For teams collaborating with AI coding assistants',
  'enterprise': 'For large organizations with advanced needs'
} as const

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

  // Debug logging to help troubleshoot tier updates
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

  // Add a visual indicator when tier is updating
  const [tierUpdating, setTierUpdating] = useState(false)

  useEffect(() => {
    // Show updating indicator briefly when tier changes
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
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Development Tier Override - Only visible in test mode */}
      {testMode && (
        <div className="mb-8 space-y-4">
          <TierOverrideSelector />
          <CreateStripeCustomerButton />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-4">
              Current Plan
            </h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gunmetal-900 dark:text-white">
                    {TIER_DISPLAY_NAMES[currentTier as keyof typeof TIER_DISPLAY_NAMES] || 'Free Individual'}
                  </p>
                  {tierUpdating && (
                    <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gunmetal-600 dark:text-gray-400 mt-1">
                  {organization ? `Organization: ${organization.name}` : 'Personal account'}
                </p>
                {organization && (
                  <button
                    onClick={() => navigate('/organization-settings')}
                    className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Organization settings
                  </button>
                )}
                <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-1">
                  {TIER_DESCRIPTIONS[currentTier as keyof typeof TIER_DESCRIPTIONS]}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-4 py-2 rounded-lg font-semibold ${isPaidTier
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400'
                  }`}>
                  {isPaidTier ? 'Active' : 'Free'}
                </span>
                {pricingTier.baseFee > 0 && (
                  <p className="text-sm text-gunmetal-600 dark:text-gray-400 mt-1">
                    ${pricingTier.baseFee}/month
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gunmetal-900 dark:text-white mb-4">
                Plan Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pricingTier.features.map((feature) => (
                  <div key={feature.id} className="flex items-start gap-2">
                    <svg
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${feature.included
                        ? 'text-green-500'
                        : 'text-gray-300 dark:text-gray-600'
                        }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      {feature.included ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293a1 1 0 00-1.414 1.414L10.586 9l-2.293 2.293a1 1 0 101.414 1.414L12 10.414l2.293 2.293a1 1 0 001.414-1.414L13.414 9l2.293-2.293a1 1 0 00-1.414-1.414L12 7.586 9.707 5.293a1 1 0 00-1.414 1.414L10.586 9l-2.293 2.293a1 1 0 101.414 1.414L12 10.414l2.293 2.293a1 1 0 001.414-1.414L13.414 9l2.293-2.293z" clipRule="evenodd" />
                      )}
                    </svg>
                    <div>
                      <p className={`text-sm font-medium ${feature.included
                        ? 'text-gunmetal-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        {feature.name}
                      </p>
                      <p className={`text-xs ${feature.included
                        ? 'text-gunmetal-600 dark:text-gray-400'
                        : 'text-gray-400 dark:text-gray-500'
                        }`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {!isPaidTier ? (
                <button
                  onClick={handleUpgradeClick}
                  className="w-full px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Upgrade Plan
                </button>
              ) : (
                <CustomerPortalButton
                  className="w-full"
                  variant="secondary"
                />
              )}

              <p className="text-xs text-center text-gunmetal-500 dark:text-gray-500">
                {isPaidTier
                  ? 'Manage your subscription, update payment methods, and view billing history'
                  : 'Unlock API integrations, team features, and advanced analytics'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Usage Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
              Usage This Month
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gunmetal-600 dark:text-gray-400">Data Retention</span>
                  <span className="font-medium text-gunmetal-900 dark:text-white">
                    {pricingTier.dataRetentionDays === -1 ? 'Unlimited' : `${pricingTier.dataRetentionDays} days`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{
                      width: pricingTier.dataRetentionDays === -1 ? '100%' : '30%'
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gunmetal-600 dark:text-gray-400">API Integrations</span>
                  <span className="font-medium text-gunmetal-900 dark:text-white">
                    {pricingTier.features.find(f => f.id === 'api_integration')?.included ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pricingTier.features.find(f => f.id === 'api_integration')?.included
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gunmetal-600 dark:text-gray-400">Team Members</span>
                  <span className="font-medium text-gunmetal-900 dark:text-white">
                    {pricingTier.maxUsers === null ? 'Unlimited' : pricingTier.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: pricingTier.maxUsers === null ? '100%' : '20%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
              Support
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${pricingTier.support === 'dedicated' ? 'bg-green-500' :
                  pricingTier.support === 'priority' ? 'bg-yellow-500' :
                    pricingTier.support === 'email' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                <span className="text-sm text-gunmetal-600 dark:text-gray-400 capitalize">
                  {pricingTier.support} Support
                </span>
              </div>
              <p className="text-xs text-gunmetal-500 dark:text-gray-500">
                {pricingTier.support === 'dedicated' && 'Personal support contact and SLA guarantee'}
                {pricingTier.support === 'priority' && 'Email support with priority response'}
                {pricingTier.support === 'email' && 'Standard email support'}
                {pricingTier.support === 'community' && 'Community support and documentation'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Pricing Table */}
      {showPricingTable && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white">
              Choose Your Plan
            </h2>
            <button
              onClick={() => setShowPricingTable(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <stripe-pricing-table
            pricing-table-id="prctbl_1SIXDRL6TuXGPgHwofLggk70"
            publishable-key="pk_live_51SIW2HL6TuXGPgHweNfizoiPnr9B71LQT6NW6DW2kvBRrNCaQId6c446qbsgNUt6kN0ayeDzwyjmH4Z4D66H7gCS00gW8CnEv1"
            customer-email={user?.email}
            // Always pass the user id; webhook will attach to org for org-billed plans.
            client-reference-id={user?.id ? `user:${user.id}` : undefined}
          />
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-4">
          Billing History
        </h2>
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No invoices yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {isPaidTier
              ? 'Your billing history will appear here after your first payment'
              : 'Subscribe to a paid plan to see your billing history'
            }
          </p>
        </div>
      </div>
    </div>
  )
}

