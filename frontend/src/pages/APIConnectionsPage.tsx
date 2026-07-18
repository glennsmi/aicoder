import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { useDeveloper } from '../contexts/DeveloperContext'
import APIConnectionManager from '../components/APIConnectionManager'
import TierOverrideSelector from '../components/TierOverrideSelector'

// Define tier mapping based on Stripe integration plan (same as BillingPage)
const TIER_MAPPING = {
  'free_individual': 'free',
  'paid_individual': 'free', // Individual paid users still use free org tier
  'team': 'team',
  'enterprise': 'enterprise'
} as const

export default function APIConnectionsPage() {
  const { organization, loading: orgLoading } = useOrganization()
  const { user } = useAuth()
  const { testMode } = useDeveloper()

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Determine current tier and check if API integrations are available
  const currentTier = user?.tier || 'free_individual'
  const orgTier = TIER_MAPPING[currentTier as keyof typeof TIER_MAPPING] || 'free'

  // API integrations are available on paid individual, team, and enterprise tiers
  const hasApiAccess = currentTier === 'paid_individual' || currentTier === 'team' || currentTier === 'enterprise'

  // Debug logging to help troubleshoot tier access
  console.log('APIConnectionsPage tier check:', {
    userTier: user?.tier,
    currentTier,
    orgTier,
    hasApiAccess,
    organizationTier: organization?.tier
  })

  if (!hasApiAccess) {
    return (
      <div className="p-8">
        {/* Development Tier Override - Only visible in test mode */}
        {testMode && (
          <div className="mb-8">
            <TierOverrideSelector />
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-2">
            Upgrade Required
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            API integrations are available on paid plans. Upgrade your account to automatically sync usage data from your AI coding tools.
          </p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <p><strong>Current Tier:</strong> {currentTier}</p>
            <p><strong>API Access:</strong> {hasApiAccess ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Required Tiers:</strong> paid_individual, team, or enterprise</p>
          </div>
          <button className="px-6 py-3 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors">
            View Plans
          </button>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            You need to join an organization to manage API connections
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Development Tier Override - Only visible in test mode */}
      {testMode && (
        <div className="mb-8">
          <TierOverrideSelector />
        </div>
      )}

      <APIConnectionManager />
    </div>
  )
}
