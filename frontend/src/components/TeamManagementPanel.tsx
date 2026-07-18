import { useEffect, useMemo, useState } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'
import { Team } from '@shared'
import { httpsCallable } from 'firebase/functions'
import {
  arrayRemove,
  arrayUnion,
  collection,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db, functions } from '../config/firebaseApp'

interface TeamManagementPanelProps {
  onTeamCreated?: () => void
}

export default function TeamManagementPanel({ onTeamCreated }: TeamManagementPanelProps) {
  const { teams, members, organization, currentRole, currentMember } = useOrganization()
  const { user, loading: authLoading } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeLoadingUserId, setRemoveLoadingUserId] = useState<string | null>(null)

  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null)

  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null)
  const [addMembersTeam, setAddMembersTeam] = useState<Team | null>(null)
  const [setManagerTeam, setSetManagerTeam] = useState<Team | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [newManagerId, setNewManagerId] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isAdmin = currentRole === 'admin'
  const isTeamManager = currentRole === 'team_manager'
  const canAccessPanel = isAdmin || isTeamManager

  const canManageTeam = (team: Team | null) => {
    if (!team) return false
    if (isAdmin) return true
    return Boolean(user?.id && team.managerId === user.id)
  }

  useEffect(() => {
    if (!openMenuTeamId) return
    const onDocClick = () => setOpenMenuTeamId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [openMenuTeamId])

  const memberById = useMemo(() => {
    const map = new Map<string, typeof members[number]>()
    for (const m of members) map.set(m.userId, m)
    return map
  }, [members])

  const openDetails = (team: Team) => {
    setOpenMenuTeamId(null)
    setActionError(null)
    setDetailsTeam(team)
  }

  const openAddMembers = (team: Team) => {
    setOpenMenuTeamId(null)
    setActionError(null)
    setMemberSearch('')
    setSelectedMemberIds(new Set())
    setAddMembersTeam(team)
  }

  const openSetManager = (team: Team) => {
    setOpenMenuTeamId(null)
    setActionError(null)
    setNewManagerId(team.managerId || '')
    setSetManagerTeam(team)
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setError('Please enter a team name')
      return
    }

    if (!organization?.id) {
      setError('No organization found')
      return
    }

    // Debug authentication state
    console.log('Auth state:', { 
      currentUser: user?.id, 
      userEmail: user?.email,
      organizationId: organization?.id 
    })

    if (authLoading) {
      setError('Authentication is still loading, please wait...')
      return
    }

    if (!user?.id) {
      setError('User not authenticated - please refresh the page and try again')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create team document directly in Firestore
      const teamsRef = collection(db, 'organizations', organization.id, 'teams')
      
      const teamData = {
        organizationId: organization.id,
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || '',
        managerId: selectedManagerId || user.id,
        memberIds: [],
        // Back-compat with older server function field name
        members: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(teamsRef, teamData)
      
      console.log('Team created successfully with ID:', docRef.id)

      // Close modal and reset form
      setShowCreateModal(false)
      setNewTeamName('')
      setNewTeamDescription('')
      setSelectedManagerId('')
      
      // Notify parent component to refresh teams
      if (onTeamCreated) {
        onTeamCreated()
      }
    } catch (err: any) {
      console.error('Error creating team:', err)
      setError(err.message || 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  if (!canAccessPanel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          You don't have permission to manage teams
        </p>
      </div>
    )
  }

  const visibleTeams = (() => {
    if (isAdmin) return teams
    const uid = user?.id
    if (!uid) return []
    const teamId = currentMember?.teamId
    return teams.filter((t) => t.managerId === uid || (teamId ? t.id === teamId : false))
  })()

  const handleRemoveMember = async (team: Team, memberId: string) => {
    if (!organization?.id) return
    if (!user?.id) {
      setActionError('You must be signed in to manage teams.')
      return
    }
    if (!canManageTeam(team)) {
      setActionError('Only the team manager or an admin can remove team members.')
      return
    }
    if (memberId === team.managerId) {
      setActionError('You can’t remove the team manager. Change manager first.')
      return
    }
    if (memberId === user.id) {
      setActionError('You can’t remove yourself from the team.')
      return
    }

    const member = memberById.get(memberId)
    const label = member?.displayName || member?.email || 'this member'
    const confirmed = window.confirm(`Remove ${label} from ${team.name}?`)
    if (!confirmed) return

    setRemoveLoadingUserId(memberId)
    setActionError(null)
    try {
      const fn = httpsCallable(functions, 'removeTeamMember')
      await fn({
        organizationId: organization.id,
        teamId: team.id,
        userId: memberId,
      })
    } catch (err: any) {
      console.error('Error removing team member:', err)
      setActionError(err?.message || 'Failed to remove team member.')
    } finally {
      setRemoveLoadingUserId(null)
    }
  }

  const handleAddMembers = async () => {
    if (!organization?.id || !addMembersTeam) return
    if (!user?.id) {
      setActionError('You must be signed in to manage teams.')
      return
    }
    if (selectedMemberIds.size === 0) {
      setActionError('Select at least one member to add.')
      return
    }

    setActionLoading(true)
    setActionError(null)
    try {
      const batch = writeBatch(db)
      const teamRef = doc(db, 'organizations', organization.id, 'teams', addMembersTeam.id)

      const memberIdsToAdd = Array.from(selectedMemberIds)

      // Update team memberIds (and legacy "members") first
      batch.update(teamRef, {
        memberIds: arrayUnion(...memberIdsToAdd),
        members: arrayUnion(...memberIdsToAdd),
        updatedAt: serverTimestamp(),
      })

      // For each member, update their teamId; if they were assigned to another team, remove from that team too.
      for (const memberId of memberIdsToAdd) {
        const member = memberById.get(memberId)
        const previousTeamId = member?.teamId

        if (previousTeamId && previousTeamId !== addMembersTeam.id) {
          const prevTeamRef = doc(db, 'organizations', organization.id, 'teams', previousTeamId)
          batch.update(prevTeamRef, {
            memberIds: arrayRemove(memberId),
            members: arrayRemove(memberId),
            updatedAt: serverTimestamp(),
          })
        }

        const memberRef = doc(db, 'organizations', organization.id, 'members', memberId)
        batch.update(memberRef, {
          teamId: addMembersTeam.id,
          updatedAt: serverTimestamp(),
        })
      }

      await batch.commit()
      setAddMembersTeam(null)
      setSelectedMemberIds(new Set())
    } catch (err: any) {
      console.error('Error adding team members:', err)
      setActionError(err?.message || 'Failed to add team members.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetManager = async () => {
    if (!organization?.id || !setManagerTeam) return
    if (!user?.id) {
      setActionError('You must be signed in to manage teams.')
      return
    }
    if (!newManagerId) {
      setActionError('Select a manager.')
      return
    }

    setActionLoading(true)
    setActionError(null)
    try {
      const batch = writeBatch(db)
      const teamRef = doc(db, 'organizations', organization.id, 'teams', setManagerTeam.id)

      batch.update(teamRef, {
        managerId: newManagerId,
        updatedAt: serverTimestamp(),
      })

      // Promote selected manager to team_manager (unless admin) and bind to team
      const newManager = memberById.get(newManagerId)
      const newManagerRef = doc(db, 'organizations', organization.id, 'members', newManagerId)
      batch.update(newManagerRef, {
        teamId: setManagerTeam.id,
        role: newManager?.role === 'admin' ? 'admin' : 'team_manager',
        updatedAt: serverTimestamp(),
      })

      // If prior manager was a team_manager for this team, demote to member (keep teamId so they remain on team)
      const prevManagerId = setManagerTeam.managerId
      if (prevManagerId && prevManagerId !== newManagerId) {
        const prev = memberById.get(prevManagerId)
        if (prev?.role === 'team_manager' && prev.teamId === setManagerTeam.id) {
          const prevRef = doc(db, 'organizations', organization.id, 'members', prevManagerId)
          batch.update(prevRef, {
            role: 'member',
            updatedAt: serverTimestamp(),
          })
        }
      }

      await batch.commit()
      setSetManagerTeam(null)
    } catch (err: any) {
      console.error('Error setting team manager:', err)
      setActionError(err?.message || 'Failed to set team manager.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gunmetal-900 dark:text-white">
          Teams
        </h2>
        {isAdmin ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Team
          </button>
        ) : null}
      </div>

      {/* Teams List */}
      {visibleTeams.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-2">
            No teams yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {isAdmin ? 'Create your first team to organize your members' : 'No teams assigned yet.'}
          </p>
          {isAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              Create Team
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleTeams.map((team) => {
            const teamMembers = members.filter(m => m.teamId === team.id)
            const manager = members.find(m => m.userId === team.managerId)

            return (
              <div
                key={team.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetails(team)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openDetails(team)
                }}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {/* Green title banner */}
                <div className="flex items-center justify-between bg-accent-400 px-6 py-3">
                  <h3 className="text-lg font-semibold text-white">
                    {team.name}
                  </h3>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuTeamId((prev) => (prev === team.id ? null : team.id))
                      }}
                      className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/20"
                      aria-label="Team actions"
                      type="button"
                    >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                    </button>

                    {openMenuTeamId === team.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-20"
                      >
                        <button
                          type="button"
                          onClick={() => openDetails(team)}
                          className="w-full text-left px-4 py-2 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddMembers(team)}
                          className="w-full text-left px-4 py-2 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Add team members
                        </button>
                        <button
                          type="button"
                          onClick={() => openSetManager(team)}
                          className="w-full text-left px-4 py-2 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Set team manager
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {team.description && (
                  <div className="px-6 pt-4">
                    <p className="text-sm text-gunmetal-600 dark:text-gray-400">
                      {team.description}
                    </p>
                  </div>
                )}

                <div className="px-6 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gunmetal-600 dark:text-gray-400">
                      {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  {manager && (
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      <span className="text-gunmetal-600 dark:text-gray-400">
                        Manager: {manager.displayName || manager.email}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mx-6 mt-4 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openDetails(team)
                    }}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailsTeam && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailsTeam(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green title banner */}
            <div className="flex items-center justify-between bg-accent-400 px-6 py-3">
              <h3 className="text-xl font-bold text-white">
                {detailsTeam.name}
              </h3>
              <button
                type="button"
                className="text-white/70 hover:text-white p-1 rounded-md hover:bg-white/20"
                onClick={() => setDetailsTeam(null)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
            {detailsTeam.description ? (
              <p className="text-sm text-gunmetal-600 dark:text-gray-400 mb-4">
                {detailsTeam.description}
              </p>
            ) : null}

            {(() => {
              const teamMembers = members.filter((m) => m.teamId === detailsTeam.id)
              const manager = members.find((m) => m.userId === detailsTeam.managerId)
              const canManageThisTeam = canManageTeam(detailsTeam)

              return (
                <div className="space-y-4">
                  {actionError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="text-xs text-gunmetal-600 dark:text-gray-400">Members</div>
                      <div className="text-lg font-semibold text-gunmetal-900 dark:text-white">
                        {teamMembers.length}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="text-xs text-gunmetal-600 dark:text-gray-400">Manager</div>
                      <div className="text-sm font-medium text-gunmetal-900 dark:text-white mt-1">
                        {manager ? (manager.displayName || manager.email) : 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                      Team members
                    </div>
                    {teamMembers.length === 0 ? (
                      <div className="text-sm text-gunmetal-600 dark:text-gray-400">
                        No members assigned yet.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        {teamMembers.map((m) => {
                          const roleLabel =
                            m.role === 'admin' ? 'Admin' : m.role === 'team_manager' ? 'Manager' : 'Member'
                          const showRemove =
                            canManageThisTeam &&
                            m.userId !== detailsTeam.managerId &&
                            m.userId !== user?.id

                          return (
                            <div
                              key={m.userId}
                              className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/40"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gunmetal-900 dark:text-white truncate">
                                  {m.displayName || 'Unknown'}
                                </div>
                                <div className="text-xs text-gunmetal-600 dark:text-gray-400 truncate">
                                  {m.email}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-xs text-gunmetal-600 dark:text-gray-400 whitespace-nowrap">
                                  {roleLabel}
                                </div>
                                {showRemove ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(detailsTeam, m.userId)}
                                    disabled={removeLoadingUserId === m.userId}
                                    className="text-xs font-medium text-red-700 dark:text-red-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {removeLoadingUserId === m.userId ? 'Removing…' : 'Remove'}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {canManageThisTeam ? (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTeam(null)
                          openAddMembers(detailsTeam)
                        }}
                        className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        Add members
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsTeam(null)
                          openSetManager(detailsTeam)
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Change manager
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })()}
            </div>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {addMembersTeam && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setAddMembersTeam(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green title banner */}
            <div className="bg-accent-400 px-6 py-3">
              <h3 className="text-xl font-bold text-white">
                Add members to {addMembersTeam.name}
              </h3>
            </div>

            <div className="p-6">
            <p className="text-sm text-gunmetal-600 dark:text-gray-400 mb-4">
              Selected members will be assigned to this team.
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
              </div>
            )}

            <div className="mb-3">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name or email..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {(() => {
              const eligible = members
                .filter((m) => m.status === 'active')
                .filter((m) => m.userId !== addMembersTeam.managerId)
                .filter((m) => m.teamId !== addMembersTeam.id)
                .filter((m) => {
                  const q = memberSearch.trim().toLowerCase()
                  if (!q) return true
                  return (
                    m.email.toLowerCase().includes(q) ||
                    (m.displayName || '').toLowerCase().includes(q)
                  )
                })

              return (
                <div className="max-h-72 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  {eligible.length === 0 ? (
                    <div className="p-4 text-sm text-gunmetal-600 dark:text-gray-400">
                      No eligible members found.
                    </div>
                  ) : (
                    eligible.map((m) => {
                      const checked = selectedMemberIds.has(m.userId)
                      return (
                        <label
                          key={m.userId}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedMemberIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(m.userId)) next.delete(m.userId)
                                else next.add(m.userId)
                                return next
                              })
                            }}
                            className="h-4 w-4 accent-primary-500"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gunmetal-900 dark:text-white truncate">
                              {m.displayName || 'Unknown'}
                            </div>
                            <div className="text-xs text-gunmetal-600 dark:text-gray-400 truncate">
                              {m.email}
                              {m.teamId ? ` • currently in ${teams.find((t) => t.id === m.teamId)?.name || 'another team'}` : ''}
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              )
            })()}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAddMembersTeam(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMembers}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Adding...' : 'Add members'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Manager Modal */}
      {setManagerTeam && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSetManagerTeam(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Green title banner */}
            <div className="bg-accent-400 px-6 py-3">
              <h3 className="text-xl font-bold text-white">
                Set manager for {setManagerTeam.name}
              </h3>
            </div>

            <div className="p-6">
            {actionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                Team Manager
              </label>
              <select
                value={newManagerId}
                onChange={(e) => setNewManagerId(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a manager</option>
                {members
                  .filter((m) => m.status === 'active')
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName || m.email}
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs text-gunmetal-600 dark:text-gray-400">
                The selected user will be promoted to <span className="font-medium">Team Manager</span> for this team (admins remain admins).
              </p>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setSetManagerTeam(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetManager}
                disabled={actionLoading || !newManagerId}
                className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full overflow-hidden">
            {/* Green title banner */}
            <div className="bg-accent-400 px-6 py-3">
              <h3 className="text-xl font-bold text-white">
                Create New Team
              </h3>
            </div>

            <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Engineering Team"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Brief description of the team"
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Team Manager (optional)
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a manager</option>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.displayName || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewTeamName('')
                  setNewTeamDescription('')
                  setSelectedManagerId('')
                  setError(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={loading || !newTeamName.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

