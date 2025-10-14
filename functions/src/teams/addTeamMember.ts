import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const addTeamMember = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const db = getFirestore()
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { organizationId, teamId, userId } = data

    if (!organizationId || !teamId || !userId) {
      throw new HttpsError('invalid-argument', 'Organization ID, team ID, and user ID are required')
    }

    try {
      // Verify user has permission
      const memberDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(auth.uid)
        .get()

      if (!memberDoc.exists) {
        throw new HttpsError('permission-denied', 'User is not a member of this organization')
      }

      const memberData = memberDoc.data()
      
      // Check if user is admin or the team manager
      const teamDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('teams')
        .doc(teamId)
        .get()

      if (!teamDoc.exists) {
        throw new HttpsError('not-found', 'Team not found')
      }

      const teamData = teamDoc.data()
      const isTeamManager = teamData?.managerId === auth.uid
      const isAdmin = memberData?.role === 'admin'

      if (!isAdmin && !isTeamManager) {
        throw new HttpsError('permission-denied', 'Only admins and team managers can add team members')
      }

      // Verify the user to be added is a member of the organization
      const targetUserDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(userId)
        .get()

      if (!targetUserDoc.exists) {
        throw new HttpsError('not-found', 'User is not a member of this organization')
      }

      // Add user to team members array
      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('teams')
        .doc(teamId)
        .update({
          members: FieldValue.arrayUnion(userId),
          updatedAt: FieldValue.serverTimestamp(),
        })

      // Update user's team assignment
      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(userId)
        .update({
          teamId: teamId,
          updatedAt: FieldValue.serverTimestamp(),
        })

      return {
        success: true,
        message: 'User added to team successfully',
      }
    } catch (error: any) {
      console.error('Error adding team member:', error)
      throw new HttpsError('internal', error.message || 'Failed to add team member')
    }
  }
)

