import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

type OrganizationRole = 'admin' | 'team_manager' | 'member'
type UserTier = 'free_individual' | 'paid_individual' | 'team' | 'enterprise'

function assertAuthenticated(uid: string | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'User must be authenticated')
}

async function assertCallerIsAdmin(db: FirebaseFirestore.Firestore, organizationId: string, uid: string) {
  const callerSnap = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('members')
    .doc(uid)
    .get()

  if (!callerSnap.exists) {
    throw new HttpsError('permission-denied', 'User is not a member of this organization')
  }

  const role = callerSnap.data()?.role as OrganizationRole | undefined
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can perform this action')
  }
}

export const updateOrganizationMemberDisplayName = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const { auth, data } = request
    assertAuthenticated(auth?.uid)

    const organizationId = String(data?.organizationId || '')
    const userId = String(data?.userId || '')
    const displayNameRaw = data?.displayName
    const displayName = typeof displayNameRaw === 'string' ? displayNameRaw.trim() : ''

    if (!organizationId || !userId) {
      throw new HttpsError('invalid-argument', 'Organization ID and user ID are required')
    }
    if (!displayName) {
      throw new HttpsError('invalid-argument', 'Display name is required')
    }
    if (displayName.length > 80) {
      throw new HttpsError('invalid-argument', 'Display name must be 80 characters or less')
    }

    const db = getFirestore()
    await assertCallerIsAdmin(db, organizationId, auth!.uid)

    const memberRef = db.collection('organizations').doc(organizationId).collection('members').doc(userId)
    const userRef = db.collection('users').doc(userId)
    const now = Timestamp.now()

    await db.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef)
      if (!memberSnap.exists) {
        throw new HttpsError('not-found', 'User is not a member of this organization')
      }

      tx.update(memberRef, {
        displayName,
        updatedAt: now,
      })

      tx.set(
        userRef,
        {
          displayName,
          updatedAt: now,
        },
        { merge: true }
      )
    })

    return { success: true }
  }
)

export const removeOrganizationMember = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const { auth, data } = request
    assertAuthenticated(auth?.uid)

    const organizationId = String(data?.organizationId || '')
    const userId = String(data?.userId || '')

    if (!organizationId || !userId) {
      throw new HttpsError('invalid-argument', 'Organization ID and user ID are required')
    }

    if (userId === auth!.uid) {
      throw new HttpsError('failed-precondition', 'You cannot remove yourself')
    }

    const db = getFirestore()
    await assertCallerIsAdmin(db, organizationId, auth!.uid)

    const orgRef = db.collection('organizations').doc(organizationId)
    const memberRef = orgRef.collection('members').doc(userId)
    const userRef = db.collection('users').doc(userId)
    const teamsRef = orgRef.collection('teams')
    const now = Timestamp.now()

    try {
      await db.runTransaction(async (tx) => {
        const [orgSnap, targetMemberSnap, targetUserSnap] = await Promise.all([
          tx.get(orgRef),
          tx.get(memberRef),
          tx.get(userRef),
        ])

        if (!orgSnap.exists) throw new HttpsError('not-found', 'Organization not found')
        if (!targetMemberSnap.exists) throw new HttpsError('not-found', 'User is not a member of this organization')

        const ownerId = String(orgSnap.data()?.ownerId || '')
        if (ownerId && ownerId === userId) {
          throw new HttpsError('failed-precondition', 'You cannot remove the organization owner')
        }

        // Disallow removing a user who manages any team.
        const managesTeamsSnap = await tx.get(teamsRef.where('managerId', '==', userId).limit(1))
        if (!managesTeamsSnap.empty) {
          throw new HttpsError(
            'failed-precondition',
            'Cannot remove a team manager. Reassign the team manager first.'
          )
        }

        // Remove user from any teams they belong to.
        const memberOfTeamsSnap = await tx.get(teamsRef.where('memberIds', 'array-contains', userId))
        for (const teamDoc of memberOfTeamsSnap.docs) {
          tx.update(teamDoc.ref, {
            memberIds: FieldValue.arrayRemove(userId),
            // Back-compat field used elsewhere in code.
            members: FieldValue.arrayRemove(userId),
            updatedAt: now,
          })
        }

        // Delete org membership doc.
        tx.delete(memberRef)

        // Update org seat usage (best-effort) for quota management.
        const usedSeats = Number(orgSnap.data()?.billingPlan?.usedSeats ?? 0)
        tx.update(orgRef, {
          'billingPlan.usedSeats': Math.max(usedSeats - 1, 0),
          updatedAt: now,
        })

        // Detach user from org.
        const existingTier = (targetUserSnap.data()?.tier as UserTier | undefined) || undefined
        const nextTier: UserTier =
          existingTier === 'paid_individual' ? 'paid_individual' : 'free_individual'

        tx.set(
          userRef,
          {
            organizationId: null,
            currentRole: 'individual',
            tier: nextTier,
            updatedAt: now,
          },
          { merge: true }
        )
      })

      return { success: true }
    } catch (error: any) {
      console.error('Error removing organization member:', error)
      if (error instanceof HttpsError) throw error
      throw new HttpsError('internal', error.message || 'Failed to remove organization member')
    }
  }
)

