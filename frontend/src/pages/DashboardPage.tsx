import { useOrganization } from '../contexts/OrganizationContext'
import { useOrgAnalytics } from '../hooks/useOrgAnalytics'
import { useCurrency } from '../hooks/useCurrency'

export default function DashboardPage() {
  const { organization, members, loading: orgLoading } = useOrganization()
  const analytics = useOrgAnalytics()
  const { formatCurrency } = useCurrency()

  if (orgLoading || analytics.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">
          Organization Dashboard
        </h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          Overview of {organization?.name || 'your organization'}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gunmetal-600 dark:text-gray-400">Total Members</p>
              <p className="text-3xl font-bold text-gunmetal-900 dark:text-white mt-1">
                {members.length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {analytics.activeUsers} active
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gunmetal-600 dark:text-gray-400">Total Tokens</p>
              <p className="text-3xl font-bold text-gunmetal-900 dark:text-white mt-1">
                {formatNumber(analytics.totalTokens)}
              </p>
              <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-1">
                {analytics.totalRequests} requests
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gunmetal-600 dark:text-gray-400">Total Cost</p>
              <p className="text-3xl font-bold text-gunmetal-900 dark:text-white mt-1">
                {formatCurrency(analytics.totalCost)}
              </p>
              <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-1">
                All time
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gunmetal-600 dark:text-gray-400">Avg per User</p>
              <p className="text-3xl font-bold text-gunmetal-900 dark:text-white mt-1">
                {formatCurrency(analytics.activeUsers > 0 ? analytics.totalCost / analytics.activeUsers : 0)}
              </p>
              <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-1">
                per active user
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
            Top Users by Cost
          </h2>
          {analytics.userStats.length > 0 ? (
            <div className="space-y-3">
              {analytics.userStats.slice(0, 5).map((userStat) => (
                <div key={userStat.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-gunmetal-900 font-semibold text-sm">
                      {userStat.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gunmetal-900 dark:text-white">
                        {userStat.displayName}
                      </p>
                      <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                        {userStat.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gunmetal-900 dark:text-white">
                      {formatCurrency(userStat.totalCost)}
                    </p>
                    <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                      {formatNumber(userStat.totalTokens)} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No usage data yet
            </div>
          )}
        </div>

        {/* Model Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
            Usage by Model
          </h2>
          {analytics.modelStats.length > 0 ? (
            <div className="space-y-4">
              {analytics.modelStats.map((modelStat) => (
                <div key={modelStat.model}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gunmetal-900 dark:text-white">
                      {modelStat.model}
                    </span>
                    <span className="text-sm font-semibold text-gunmetal-900 dark:text-white">
                      {formatCurrency(modelStat.totalCost)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${modelStat.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gunmetal-600 dark:text-gray-400 mt-1">
                    {modelStat.percentage.toFixed(1)}% of total cost
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No model data yet
            </div>
          )}
        </div>
      </div>

      {/* Team Stats if available */}
      {analytics.teamStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-4">
            Team Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.teamStats.map((teamStat) => (
              <div key={teamStat.teamId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gunmetal-900 dark:text-white mb-2">
                  {teamStat.teamName}
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gunmetal-600 dark:text-gray-400">
                    {teamStat.memberCount} members
                  </p>
                  <p className="text-gunmetal-900 dark:text-white font-semibold">
                    {formatCurrency(teamStat.totalCost)}
                  </p>
                  <p className="text-gunmetal-600 dark:text-gray-400">
                    {formatNumber(teamStat.totalTokens)} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

