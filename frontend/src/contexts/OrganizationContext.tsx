import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  Team,
  Permission,
  hasPermission,
  canViewUserData,
  canManageUser,
  canAccessTeam,
} from '@cursor-costs/shared';
import { useAuth } from './AuthContext';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../config/firebaseApp';

interface OrganizationContextType {
  // Organization data
  organization: Organization | null;
  organizationLoading: boolean;
  
  // Current user's membership
  currentMember: OrganizationMember | null;
  currentRole: OrganizationRole | null;
  
  // Organization members
  members: OrganizationMember[];
  membersLoading: boolean;
  
  // Teams
  teams: Team[];
  teamsLoading: boolean;
  currentTeam: Team | null; // For team managers
  
  // Permission checking
  hasPermission: (permission: Permission) => boolean;
  canViewUser: (userId: string) => boolean;
  canManageUser: (targetUserId: string, targetRole: OrganizationRole) => boolean;
  canAccessTeam: (teamId: string) => boolean;
  
  // Actions
  refreshOrganization: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshTeams: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, loading: authLoading } = useAuth();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [currentRole, setCurrentRole] = useState<OrganizationRole | null>(null);
  
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  // Fetch organization data
  const fetchOrganization = async (orgId: string) => {
    try {
      setOrganizationLoading(true);
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      
      if (orgDoc.exists()) {
        setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
    } finally {
      setOrganizationLoading(false);
    }
  };

  // Fetch current user's membership
  const fetchCurrentMember = async (orgId: string, userId: string) => {
    try {
      const memberDoc = await getDoc(doc(db, 'organizations', orgId, 'members', userId));
      
      if (memberDoc.exists()) {
        const memberData = { userId: memberDoc.id, ...memberDoc.data() } as OrganizationMember;
        setCurrentMember(memberData);
        setCurrentRole(memberData.role);
      } else {
        setCurrentMember(null);
        setCurrentRole(null);
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      setCurrentMember(null);
      setCurrentRole(null);
    }
  };

  // Fetch all organization members
  const fetchMembers = async (orgId: string) => {
    try {
      setMembersLoading(true);
      const membersRef = collection(db, 'organizations', orgId, 'members');
      const q = query(membersRef, where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      
      const membersList = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      } as OrganizationMember));
      
      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch teams
  const fetchTeams = async (orgId: string) => {
    try {
      setTeamsLoading(true);
      const teamsRef = collection(db, 'organizations', orgId, 'teams');
      const snapshot = await getDocs(teamsRef);
      
      const teamsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Team));
      
      setTeams(teamsList);
      
      // Set current team if user is a team manager
      if (currentMember?.teamId) {
        const userTeam = teamsList.find(t => t.id === currentMember.teamId);
        setCurrentTeam(userTeam || null);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Main effect: Load organization data when user changes
  useEffect(() => {
    let unsubscribers: Unsubscribe[] = [];

    const loadOrganizationData = async () => {
      if (!user || authLoading) {
        setOrganization(null);
        setCurrentMember(null);
        setCurrentRole(null);
        setMembers([]);
        setTeams([]);
        setOrganizationLoading(false);
        setMembersLoading(false);
        setTeamsLoading(false);
        return;
      }

      const orgId = user.organizationId;
      
      // If user has no organization, they're an individual user
      if (!orgId) {
        setOrganization(null);
        setCurrentMember(null);
        setCurrentRole('individual' as OrganizationRole);
        setMembers([]);
        setTeams([]);
        setOrganizationLoading(false);
        setMembersLoading(false);
        setTeamsLoading(false);
        return;
      }

      // Fetch organization and member data
      await Promise.all([
        fetchOrganization(orgId),
        fetchCurrentMember(orgId, user.id),
      ]);

      // Fetch members and teams after we know the user's role
      await Promise.all([
        fetchMembers(orgId),
        fetchTeams(orgId),
      ]);

      // Set up real-time listeners for organization changes
      const orgUnsub = onSnapshot(
        doc(db, 'organizations', orgId),
        (doc) => {
          if (doc.exists()) {
            setOrganization({ id: doc.id, ...doc.data() } as Organization);
          }
        },
        (error) => console.error('Organization listener error:', error)
      );

      // Listen to member changes
      const membersUnsub = onSnapshot(
        query(collection(db, 'organizations', orgId, 'members'), where('status', '==', 'active')),
        (snapshot) => {
          const membersList = snapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
          } as OrganizationMember));
          setMembers(membersList);
        },
        (error) => console.error('Members listener error:', error)
      );

      unsubscribers = [orgUnsub, membersUnsub];
    };

    loadOrganizationData();

    // Cleanup listeners
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, authLoading]);

  // Permission checking functions
  const checkPermission = (permission: Permission): boolean => {
    if (!currentRole) return false;
    return hasPermission(currentRole, permission);
  };

  const checkCanViewUser = (userId: string): boolean => {
    if (!currentRole || !user) return false;
    
    const teamMemberIds = currentTeam?.memberIds || [];
    return canViewUserData(currentRole, userId, user.id, teamMemberIds);
  };

  const checkCanManageUser = (targetUserId: string, targetRole: OrganizationRole): boolean => {
    if (!currentRole || !user) return false;
    
    const teamMemberIds = currentTeam?.memberIds || [];
    return canManageUser(currentRole, targetRole, targetUserId, user.id, teamMemberIds);
  };

  const checkCanAccessTeam = (teamId: string): boolean => {
    if (!currentRole) return false;
    return canAccessTeam(currentRole, teamId, currentMember?.teamId);
  };

  // Refresh functions
  const refreshOrganization = async () => {
    if (user?.organizationId) {
      await fetchOrganization(user.organizationId);
    }
  };

  const refreshMembers = async () => {
    if (user?.organizationId) {
      await fetchMembers(user.organizationId);
    }
  };

  const refreshTeams = async () => {
    if (user?.organizationId) {
      await fetchTeams(user.organizationId);
    }
  };

  const value: OrganizationContextType = {
    organization,
    organizationLoading,
    currentMember,
    currentRole,
    members,
    membersLoading,
    teams,
    teamsLoading,
    currentTeam,
    hasPermission: checkPermission,
    canViewUser: checkCanViewUser,
    canManageUser: checkCanManageUser,
    canAccessTeam: checkCanAccessTeam,
    refreshOrganization,
    refreshMembers,
    refreshTeams,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Permission Guard Component
interface PermissionGuardProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useOrganization();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Role Guard Component
interface RoleGuardProps {
  allowedRoles: OrganizationRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { currentRole } = useOrganization();
  
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

