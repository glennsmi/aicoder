import { useOrganization } from '../contexts/OrganizationContext'

export default function TeamsPage() {
  const { organization, teams, loading } = useOrganization()

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
            Team Management
          </h1>
          <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
            Manage teams within {organization?.name}
          </p>
        </div>
        <button className="px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-2">
            No teams yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first team to organize members and track usage
          </p>
          <button className="px-6 py-3 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors">
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-2">
                {team.name}
              </h3>
              {team.description && (
                <p className="text-sm text-gunmetal-600 dark:text-gray-400 mb-4">
                  {team.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm text-gunmetal-600 dark:text-gray-400">
                <span>0 members</span>
                <button className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                  Manage →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

