import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

function defaultWorkspaceName(email: string): string {
  return `${email}'s Workspace`
}

export const syncMyEmailCascade = onCall({ region: 'europe-west2' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.')

  const authUser = await admin.auth().getUser(uid)
  const canonicalEmail = normalizeEmail(authUser.email)
  if (!canonicalEmail) {
    throw new HttpsError('failed-precondition', 'Authenticated user has no email.')
  }

  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  const userData = (userSnap.data() || {}) as Record<string, unknown>
  const priorUserEmail = normalizeEmail(userData.email)
  const organizationId = typeof userData.organizationId === 'string' ? userData.organizationId : ''

  const batch = db.batch()
  const updatedPaths = new Set<string>()

  if (priorUserEmail !== canonicalEmail) {
    batch.set(
      userRef,
      { email: canonicalEmail, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    )
    updatedPaths.add(`users/${uid}`)
  }

  const memberDocs = await db.collectionGroup('members').where('userId', '==', uid).get()
  memberDocs.docs.forEach((memberDoc) => {
    const memberEmail = normalizeEmail(memberDoc.data()?.email)
    if (memberEmail !== canonicalEmail) {
      batch.set(
        memberDoc.ref,
        { email: canonicalEmail, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      updatedPaths.add(memberDoc.ref.path)
    }
  })

  if (organizationId) {
    const orgRef = db.collection('organizations').doc(organizationId)
    const orgSnap = await orgRef.get()
    const orgData = (orgSnap.data() || {}) as Record<string, unknown>
    const ownerId = String(orgData.ownerId || '')
    const orgName = String(orgData.name || '')

    if (ownerId === uid) {
      const oldDefaultName = priorUserEmail ? defaultWorkspaceName(priorUserEmail) : ''
      const newDefaultName = defaultWorkspaceName(canonicalEmail)
      if (orgName === oldDefaultName && orgName !== newDefaultName) {
        batch.set(
          orgRef,
          { name: newDefaultName, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        )
        updatedPaths.add(orgRef.path)
      }
    }
  }

  if (updatedPaths.size > 0) {
    await batch.commit()
  }

  const duplicatesSnap = await db.collection('users').where('email', '==', canonicalEmail).limit(20).get()
  const duplicateUserDocIds = duplicatesSnap.docs
    .map((doc) => doc.id)
    .filter((id) => id !== uid)

  return {
    ok: true,
    canonicalEmail,
    updatesApplied: updatedPaths.size,
    updatedPaths: Array.from(updatedPaths),
    duplicateUserDocIds,
  }
})
