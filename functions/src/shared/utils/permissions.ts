import { OrganizationRole } from '../types/organization';

/**
 * Permission Types
 */
export enum Permission {
  // Data Viewing Permissions
  VIEW_OWN_DATA = 'view_own_data',
  VIEW_TEAM_DATA = 'view_team_data',
  VIEW_ORG_DATA = 'view_org_data',
  
  // User Management
  INVITE_USERS = 'invite_users',
  MANAGE_USERS = 'manage_users',
  REMOVE_USERS = 'remove_users',
  
  // Team Management
  VIEW_TEAMS = 'view_teams',
  MANAGE_TEAMS = 'manage_teams',
  ASSIGN_TEAM_MEMBERS = 'assign_team_members',
  
  // Organization Management
  MANAGE_ORGANIZATION = 'manage_organization',
  MANAGE_BILLING = 'manage_billing',
  
  // API & Integrations
  VIEW_API_CONNECTIONS = 'view_api_connections',
  MANAGE_API_CONNECTIONS = 'manage_api_connections',
  
  // Data Management
  UPLOAD_CSV = 'upload_csv',
  DELETE_DATA = 'delete_data',
  EXPORT_REPORTS = 'export_reports',
  
  // Settings
  MANAGE_SETTINGS = 'manage_settings',
}

/**
 * Role-based Permission Matrix
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  admin: [
    // Admins have all permissions
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_TEAM_DATA,
    Permission.VIEW_ORG_DATA,
    Permission.INVITE_USERS,
    Permission.MANAGE_USERS,
    Permission.REMOVE_USERS,
    Permission.VIEW_TEAMS,
    Permission.MANAGE_TEAMS,
    Permission.ASSIGN_TEAM_MEMBERS,
    Permission.MANAGE_ORGANIZATION,
    Permission.MANAGE_BILLING,
    Permission.VIEW_API_CONNECTIONS,
    Permission.MANAGE_API_CONNECTIONS,
    Permission.UPLOAD_CSV,
    Permission.DELETE_DATA,
    Permission.EXPORT_REPORTS,
    Permission.MANAGE_SETTINGS,
  ],
  team_manager: [
    // Team managers can manage their team
    Permission.VIEW_OWN_DATA,
    Permission.VIEW_TEAM_DATA,
    Permission.INVITE_USERS, // Can invite to their team
    Permission.VIEW_TEAMS,
    Permission.ASSIGN_TEAM_MEMBERS, // Only to their own team
    Permission.UPLOAD_CSV,
    Permission.EXPORT_REPORTS, // For their team
  ],
  member: [
    // Members can only view their own data and upload
    Permission.VIEW_OWN_DATA,
    Permission.UPLOAD_CSV,
  ],
};

/**
 * Check if a user has a specific permission based on their role
 */
export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(role: OrganizationRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(role: OrganizationRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: OrganizationRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user can view another user's data
 */
export function canViewUserData(
  viewerRole: OrganizationRole,
  targetUserId: string,
  viewerUserId: string,
  viewerTeamMemberIds?: string[]
): boolean {
  // Can always view own data
  if (targetUserId === viewerUserId) {
    return true;
  }

  // Admins can view all data
  if (hasPermission(viewerRole, Permission.VIEW_ORG_DATA)) {
    return true;
  }

  // Team managers can view their team members' data
  if (hasPermission(viewerRole, Permission.VIEW_TEAM_DATA)) {
    return viewerTeamMemberIds?.includes(targetUserId) ?? false;
  }

  return false;
}

/**
 * Check if user can manage another user
 */
export function canManageUser(
  managerRole: OrganizationRole,
  targetUserRole: OrganizationRole,
  targetUserId: string,
  managerUserId: string,
  managerTeamMemberIds?: string[]
): boolean {
  // Can't manage yourself
  if (targetUserId === managerUserId) {
    return false;
  }

  // Admins can manage everyone
  if (hasPermission(managerRole, Permission.MANAGE_USERS)) {
    return true;
  }

  // Team managers can manage members in their team (but not other team managers or admins)
  if (managerRole === 'team_manager' && targetUserRole === 'member') {
    return managerTeamMemberIds?.includes(targetUserId) ?? false;
  }

  return false;
}

/**
 * Check if user can access team data
 */
export function canAccessTeam(
  userRole: OrganizationRole,
  teamId: string,
  userTeamId?: string
): boolean {
  // Admins can access all teams
  if (hasPermission(userRole, Permission.VIEW_ORG_DATA)) {
    return true;
  }

  // Team managers can access their own team
  if (userRole === 'team_manager' && userTeamId === teamId) {
    return true;
  }

  return false;
}

/**
 * Permission guard for UI components
 */
export interface PermissionGuardProps {
  role: OrganizationRole;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Helper to format permission names for display
 */
export function formatPermissionName(permission: Permission): string {
  return permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get human-readable role name
 */
export function formatRoleName(role: OrganizationRole): string {
  const roleNames: Record<OrganizationRole, string> = {
    admin: 'Administrator',
    team_manager: 'Team Manager',
    member: 'Member',
  };
  return roleNames[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: OrganizationRole): string {
  const descriptions: Record<OrganizationRole, string> = {
    admin: 'Full access to all organization data, settings, and management',
    team_manager: 'Manage assigned team members and view team analytics',
    member: 'View personal usage data and upload CSV files',
  };
  return descriptions[role];
}

