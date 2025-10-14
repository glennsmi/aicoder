import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { Team } from '../../../shared/src/types/team'

export const createTeam = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const db = getFirestore()
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { organizationId, name, description, managerId } = data

    if (!organizationId || !name) {
      throw new HttpsError('invalid-argument', 'Organization ID and team name are required')
    }

    try {
      // Verify user has permission to create teams
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
      if (memberData?.role !== 'admin' && memberData?.role !== 'team_manager') {
        throw new HttpsError('permission-denied', 'Only admins and team managers can create teams')
      }

      // Create the team
      const teamRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('teams')
        .doc()

      const team: Team = {
        id: teamRef.id,
        organizationId,
        name,
        description: description || '',
        managerId: managerId || auth.uid,
        memberIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await teamRef.set(team)

      // Update organization's team count
      await db
        .collection('organizations')
        .doc(organizationId)
        .update({
          updatedAt: FieldValue.serverTimestamp(),
        })

      return {
        success: true,
        teamId: teamRef.id,
        team,
      }
    } catch (error: any) {
      console.error('Error creating team:', error)
      throw new HttpsError('internal', error.message || 'Failed to create team')
    }
  }
)

