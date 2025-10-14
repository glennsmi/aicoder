import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'

export default function BillingPage() {
  const { organization } = useOrganization()
  const { user } = useAuth()

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-4">
              Current Plan
            </h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-2xl font-bold text-gunmetal-900 dark:text-white capitalize">
                  {user?.tier?.replace('_', ' ') || 'Free Individual'}
                </p>
                <p className="text-sm text-gunmetal-600 dark:text-gray-400 mt-1">
                  {organization ? `Organization: ${organization.name}` : 'Personal account'}
                </p>
              </div>
              <span className="px-4 py-2 bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg font-semibold">
                Active
              </span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-semibold text-gunmetal-900 dark:text-white mb-4">
                Plan Features
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-gunmetal-600 dark:text-gray-400">
                  <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Manual CSV upload
                </li>
                <li className="flex items-center gap-2 text-sm text-gunmetal-600 dark:text-gray-400">
                  <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Usage analytics and charts
                </li>
                <li className="flex items-center gap-2 text-sm text-gunmetal-600 dark:text-gray-400">
                  <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Cost tracking and reporting
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button className="w-full px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
              Usage This Month
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gunmetal-600 dark:text-gray-400">Storage</span>
                  <span className="font-medium text-gunmetal-900 dark:text-white">0 MB</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gunmetal-600 dark:text-gray-400">API Calls</span>
                  <span className="font-medium text-gunmetal-900 dark:text-white">0</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            Your billing history will appear here
          </p>
        </div>
      </div>
    </div>
  )
}

