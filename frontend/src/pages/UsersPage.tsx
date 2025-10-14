import { useOrganization } from '../contexts/OrganizationContext'

export default function UsersPage() {
  const { organization, members, loading } = useOrganization()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
            Manage users in {organization?.name}
          </p>
        </div>
        <button className="px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Invite User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  User
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  Role
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  Team
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  Joined
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gunmetal-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <tr key={member.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-gunmetal-900 font-semibold">
                        {member.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gunmetal-900 dark:text-white">
                          {member.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400 capitalize">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gunmetal-600 dark:text-gray-400">
                      {member.teamId || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gunmetal-600 dark:text-gray-400">
                      {member.joinedAt ? new Date((member.joinedAt as any).seconds * 1000).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gunmetal-600 hover:text-gunmetal-900 dark:text-gray-400 dark:hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

