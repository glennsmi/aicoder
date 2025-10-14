import { useOrganization } from '../contexts/OrganizationContext'
import UserManagementTable from '../components/UserManagementTable'

export default function UsersPage() {
  const { organization, loading } = useOrganization()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            You need to join an organization to manage users
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <UserManagementTable />
    </div>
  )
}
