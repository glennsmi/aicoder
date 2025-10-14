import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import APIConnectionManager from '../components/APIConnectionManager'

export default function APIConnectionsPage() {
  const { organization, loading: orgLoading } = useOrganization()
  const { user } = useAuth()

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Check if user has paid tier
  const hasPaidTier = user?.tier && (user.tier.startsWith('paid_') || user.tier.startsWith('team_') || user.tier.startsWith('enterprise_'))

  if (!hasPaidTier) {
    return (
      <div className="p-8">
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
      <APIConnectionManager />
    </div>
  )
}
