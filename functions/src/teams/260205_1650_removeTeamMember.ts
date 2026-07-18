import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const removeTeamMember = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const db = getFirestore()
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const organizationId = data?.organizationId as string | undefined
    const teamId = data?.teamId as string | undefined
    const userId = data?.userId as string | undefined

    if (!organizationId || !teamId || !userId) {
      throw new HttpsError(
        'invalid-argument',
        'Organization ID, team ID, and user ID are required'
      )
    }

    try {
      const callerMemberRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(auth.uid)

      const teamRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('teams')
        .doc(teamId)

      const targetMemberRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(userId)

      const [callerSnap, teamSnap, targetSnap] = await Promise.all([
        callerMemberRef.get(),
        teamRef.get(),
        targetMemberRef.get(),
      ])

      if (!callerSnap.exists) {
        throw new HttpsError(
          'permission-denied',
          'User is not a member of this organization'
        )
      }

      if (!teamSnap.exists) {
        throw new HttpsError('not-found', 'Team not found')
      }

      if (!targetSnap.exists) {
        throw new HttpsError('not-found', 'User is not a member of this organization')
      }

      const callerRole = callerSnap.data()?.role
      const teamData = teamSnap.data()
      const targetData = targetSnap.data()

      const isAdmin = callerRole === 'admin'
      const isTeamManager = teamData?.managerId === auth.uid

      if (!isAdmin && !isTeamManager) {
        throw new HttpsError(
          'permission-denied',
          'Only admins and the team manager can remove team members'
        )
      }

      if (teamData?.managerId === userId) {
        throw new HttpsError(
          'failed-precondition',
          'Cannot remove the team manager. Change manager first.'
        )
      }

      if (targetData?.teamId !== teamId) {
        throw new HttpsError(
          'failed-precondition',
          'User is not assigned to this team'
        )
      }

      await db.runTransaction(async (tx) => {
        tx.update(teamRef, {
          memberIds: FieldValue.arrayRemove(userId),
          members: FieldValue.arrayRemove(userId),
          updatedAt: FieldValue.serverTimestamp(),
        })

        const memberUpdate: Record<string, any> = {
          teamId: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        }

        // If they were a team_manager assigned to this team, demote them.
        if (targetData?.role === 'team_manager' && targetData?.teamId === teamId) {
          memberUpdate.role = 'member'
        }

        tx.update(targetMemberRef, memberUpdate)
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error removing team member:', error)
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', error.message || 'Failed to remove team member')
    }
  }
)

