import { useEffect, useState } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { OrganizationMember } from '@shared'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../config/firebaseApp'
import { useOrgInvitations } from '../hooks/useOrgInvitations'
import { useAuth } from '../contexts/AuthContext'

export default function UserManagementTable() {
  const { organization, members, teams, canManageUsers, currentRole } = useOrganization()
  const { user } = useAuth()
  const organizationId = organization?.id || null
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'team_manager' | 'member'>('member')
  const [inviteTeamId, setInviteTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showPendingInvites, setShowPendingInvites] = useState(false)
  const [actionsOpenForUserId, setActionsOpenForUserId] = useState<string | null>(null)
  const [editMember, setEditMember] = useState<OrganizationMember | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null)

  const canManage = canManageUsers()
  const isAdminViewer = currentRole === 'admin'

  const {
    invitations: pendingInvites,
    loading: pendingInvitesLoading,
    error: pendingInvitesError,
  } = useOrgInvitations(
    organizationId,
    'pending'
  )

  useEffect(() => {
    if (!actionsOpenForUserId) return

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const inside = target.closest(`[data-actions-root="${actionsOpenForUserId}"]`)
      if (inside) return
      setActionsOpenForUserId(null)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [actionsOpenForUserId])

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!organizationId) {
        throw new Error('No organization selected')
      }

      const fn = httpsCallable(functions, 'createInvitation')
      const res: any = await fn({
        organizationId,
        email: inviteEmail,
        role: inviteRole,
        teamId: inviteTeamId || null,
      })

      const url = res?.data?.invitationUrl as string | undefined
      setSuccess(url ? 'Invitation sent. Link copied to clipboard.' : 'Invitation sent.')

      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      }

      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
      setInviteTeamId('')
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      searchTerm === '' ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.displayName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === 'all' || member.role === filterRole
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const buildInviteLink = (invitationId: string, token: string) => {
    const base = window.location.origin.replace(/\/$/, '')
    const params = new URLSearchParams({ invitationId, token })
    return `${base}/invite?${params.toString()}`
  }

  const handleResendInvite = async (invitationId: string) => {
    try {
      setError(null)
      setSuccess(null)
      const fn = httpsCallable(functions, 'resendInvitation')
      const res: any = await fn({ invitationId })
      const url = res?.data?.invitationUrl as string | undefined
      setSuccess(url ? 'Invitation resent. Link copied to clipboard.' : 'Invitation resent.')
      if (url && navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
    } catch (err: any) {
      setError(err.message || 'Failed to resend invitation')
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      setError(null)
      setSuccess(null)
      const fn = httpsCallable(functions, 'revokeInvitation')
      await fn({ invitationId })
      setSuccess('Invitation deleted.')
    } catch (err: any) {
      setError(err.message || 'Failed to delete invitation')
    }
  }

  const openEditNameModal = (member: OrganizationMember) => {
    setError(null)
    setSuccess(null)
    setEditMember(member)
    setEditDisplayName(member.displayName || '')
  }

  const handleSaveDisplayName = async () => {
    if (!organizationId || !editMember) return
    const displayName = editDisplayName.trim()
    if (!displayName) {
      setError('Please enter a name')
      return
    }

    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const fn = httpsCallable(functions, 'updateOrganizationMemberDisplayName')
      await fn({
        organizationId,
        userId: editMember.userId,
        displayName,
      })
      setSuccess('Name updated.')
      setEditMember(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update name')
    } finally {
      setActionLoading(false)
    }
  }

  const openRemoveMemberModal = (member: OrganizationMember) => {
    setError(null)
    setSuccess(null)
    setMemberToRemove(member)
  }

  const handleConfirmRemoveMember = async () => {
    if (!organizationId || !memberToRemove) return
    try {
      setActionLoading(true)
      setError(null)
      setSuccess(null)
      const fn = httpsCallable(functions, 'removeOrganizationMember')
      await fn({
        organizationId,
        userId: memberToRemove.userId,
      })
      setSuccess('User removed.')
      setMemberToRemove(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove user')
    } finally {
      setActionLoading(false)
    }
  }

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You don't have permission to manage users
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gunmetal-900 dark:text-white">Members</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gunmetal-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showPendingInvites}
                onChange={(e) => setShowPendingInvites(e.target.checked)}
                className="h-4 w-4 accent-primary-500"
              />
              Show pending invites ({pendingInvites.length})
            </label>
            {success && <span className="text-sm text-green-700 dark:text-green-300">{success}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="team_manager">Team Manager</option>
          <option value="member">Member</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {pendingInvitesError && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{pendingInvitesError}</p>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                        ? 'No members match your filters'
                        : 'No members yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const memberTeam = teams.find((t) => t.id === member.teamId)
                  const isSelf = Boolean(user?.id && user.id === member.userId)
                  const isOwner = Boolean(organization?.ownerId && organization.ownerId === member.userId)
                  const canRemoveMember = isAdminViewer && !isSelf && !isOwner
                  
                  return (
                    <tr key={member.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-gunmetal-900 font-semibold">
                            {member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gunmetal-900 dark:text-white">
                              {member.displayName || 'Unknown'}
                            </div>
                            <div className="text-sm text-gunmetal-600 dark:text-gray-400">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                          {member.role === 'admin' ? 'Admin' : member.role === 'team_manager' ? 'Team Manager' : 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gunmetal-600 dark:text-gray-400">
                        {memberTeam ? memberTeam.name : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : member.status === 'invited'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gunmetal-600 dark:text-gray-400">
                        {member.joinedAt ? (
                          member.joinedAt instanceof Date 
                            ? member.joinedAt.toLocaleDateString() 
                            : member.joinedAt.toDate().toLocaleDateString()
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-flex" data-actions-root={member.userId}>
                          <button
                            type="button"
                            onClick={() =>
                              setActionsOpenForUserId((prev) => (prev === member.userId ? null : member.userId))
                            }
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Open member actions"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>

                          {actionsOpenForUserId === member.userId && (
                            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setActionsOpenForUserId(null)
                                  openEditNameModal(member)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                Edit name
                              </button>
                              {isAdminViewer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!canRemoveMember) return
                                    setActionsOpenForUserId(null)
                                    openRemoveMemberModal(member)
                                  }}
                                  disabled={!canRemoveMember}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    isSelf
                                      ? 'You cannot remove yourself'
                                      : isOwner
                                      ? 'You cannot remove the organization owner'
                                      : undefined
                                  }
                                >
                                  Remove user
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites */}
      {showPendingInvites && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white">Pending invites</h3>
            {pendingInvitesLoading && (
              <span className="text-sm text-gunmetal-600 dark:text-gray-300">Loading…</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gunmetal-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pendingInvites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gunmetal-600 dark:text-gray-300">
                      No pending invites
                    </td>
                  </tr>
                ) : (
                  pendingInvites.map((inv: any) => {
                    const team = teams.find((t) => t.id === inv.teamId)
                    const expires =
                      inv.expiresAt?.toDate?.() instanceof Date
                        ? inv.expiresAt.toDate()
                        : inv.expiresAt instanceof Date
                          ? inv.expiresAt
                          : null

                    const inviteLink = inv.token ? buildInviteLink(inv.id, inv.token) : null

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm text-gunmetal-900 dark:text-white">{inv.email}</td>
                        <td className="px-6 py-4 text-sm text-gunmetal-600 dark:text-gray-300">{inv.role}</td>
                        <td className="px-6 py-4 text-sm text-gunmetal-600 dark:text-gray-300">
                          {team ? team.name : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gunmetal-600 dark:text-gray-300">
                          {expires ? expires.toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleResendInvite(inv.id)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-500 text-gunmetal-900 hover:bg-primary-600 transition-colors"
                            >
                              Resend
                            </button>
                            <button
                              onClick={async () => {
                                if (!inviteLink) return
                                await navigator.clipboard.writeText(inviteLink)
                                setSuccess('Invite link copied to clipboard.')
                              }}
                              disabled={!inviteLink}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Copy link
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-4">
              Invite New Member
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="member">Member</option>
                  <option value="team_manager">Team Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Team (optional)
                </label>
                <select
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteRole('member')
                  setInviteTeamId('')
                  setError(null)
                  setSuccess(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={loading || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-2">Edit member name</h3>
            <p className="text-sm text-gunmetal-600 dark:text-gray-300 mb-4">
              Updating the name for <span className="font-medium">{editMember.email}</span>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setEditMember(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDisplayName}
                disabled={actionLoading || !editDisplayName.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Modal */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-2">Remove user</h3>
            <p className="text-sm text-gunmetal-600 dark:text-gray-300 mb-4">
              This will remove <span className="font-medium">{memberToRemove.displayName || memberToRemove.email}</span>{' '}
              from the organization.
            </p>
            <div className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">
                They will lose access to org dashboards and data. This is intended for seat/quota management.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveMember}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 transition-colors font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

