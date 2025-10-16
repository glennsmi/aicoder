import * as admin from 'firebase-admin'
import { OrganizationRole, Permission } from '../shared'

const db = admin.firestore()

/**
 * Check if a user has a specific permission in an organization
 * @param userId The user's Firebase UID
 * @param organizationId The organization ID
 * @param permission The permission to check
 * @returns Promise resolving to true if user has permission, false otherwise
 */
export async function checkPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  try {
    // Get user's role in the organization
    const memberDoc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('members')
      .doc(userId)
      .get()

    if (!memberDoc.exists) {
      return false
    }

    const memberData = memberDoc.data()
    const role = memberData?.role as OrganizationRole

    if (!role) {
      return false
    }

    // Check if role has the required permission
    return hasPermission(role, permission)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Check if a role has a specific permission
 * @param role The user's role
 * @param permission The permission to check
 * @returns True if role has permission, false otherwise
 */
export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  const rolePermissions: Record<OrganizationRole, Permission[]> = {
    admin: [
      Permission.VIEW_OWN_DATA,
      Permission.VIEW_TEAM_DATA,
      Permission.VIEW_ORG_DATA,
      Permission.MANAGE_USERS,
      Permission.MANAGE_TEAMS,
      Permission.MANAGE_BILLING,
      Permission.MANAGE_SETTINGS,
      Permission.EXPORT_REPORTS
    ],
    team_manager: [
      Permission.VIEW_OWN_DATA,
      Permission.VIEW_TEAM_DATA,
      Permission.ASSIGN_TEAM_MEMBERS,
      Permission.EXPORT_REPORTS
    ],
    member: [
      Permission.VIEW_OWN_DATA
    ]
  }

  const permissions = rolePermissions[role] || []
  return permissions.includes(permission)
}

export { Permission } from '../shared'

