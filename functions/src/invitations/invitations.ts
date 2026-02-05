import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'
import { sendInvitationEmail } from '../utils/email'

type OrganizationRole = 'admin' | 'team_manager' | 'member'

const MAILER_SEND_KEY = defineSecret('MAILER_SEND_KEY')
const MAIL_FROM_EMAIL = defineSecret('MAIL_FROM_EMAIL')

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

function getAppBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'https://app.aicoder.guru').replace(/\/$/, '')
}

function buildInvitationUrl(invitationId: string, token: string): string {
  const base = getAppBaseUrl()
  const params = new URLSearchParams({ invitationId, token })
  return `${base}/invite?${params.toString()}`
}

function generateToken(): string {
  // URL-safe, copy/paste friendly
  return randomBytes(24).toString('base64url')
}

async function assertCanManageInvites(db: FirebaseFirestore.Firestore, organizationId: string, uid: string) {
  const memberSnap = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('members')
    .doc(uid)
    .get()

  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'You are not a member of this organization')
  }

  const role = memberSnap.data()?.role as OrganizationRole | undefined
  if (role !== 'admin' && role !== 'team_manager') {
    throw new HttpsError('permission-denied', 'Only admins and team managers can manage invitations')
  }
}

export const createInvitation = onCall(
  { region: 'europe-west2', secrets: [MAILER_SEND_KEY, MAIL_FROM_EMAIL] },
  async (request) => {
  const { auth, data } = request
  if (!auth?.uid || !auth.token?.email) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const organizationId = String(data?.organizationId || '')
  const email = normalizeEmail(data?.email)
  const role = (data?.role || 'member') as OrganizationRole
  const teamId = data?.teamId ? String(data.teamId) : null

  if (!organizationId || !email) {
    throw new HttpsError('invalid-argument', 'Organization ID and email are required')
  }

  if (!['admin', 'team_manager', 'member'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role')
  }

  const db = getFirestore()
  await assertCanManageInvites(db, organizationId, auth.uid)

  // Prevent inviting existing org members (by email).
  const existingMembers = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('members')
    .where('email', '==', email)
    .limit(1)
    .get()

  if (!existingMembers.empty) {
    throw new HttpsError('already-exists', 'That email is already a member of this organization')
  }

  // Reuse an existing pending invitation if present; otherwise create a new one.
  const existingInvites = await db
    .collection('invitations')
    .where('organizationId', '==', organizationId)
    .where('email', '==', email)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  const inviterName =
    (auth.token?.name as string | undefined) ||
    (auth.token?.firebase?.sign_in_provider ? undefined : undefined) ||
    'AICoder.Guru Admin'
  const inviterEmail = String(auth.token.email)

  const orgSnap = await db.collection('organizations').doc(organizationId).get()
  const organizationName = (orgSnap.data()?.name as string | undefined) || 'your organization'

  let teamName: string | undefined
  if (teamId) {
    const teamSnap = await db.collection('organizations').doc(organizationId).collection('teams').doc(teamId).get()
    teamName = (teamSnap.data()?.name as string | undefined) || undefined
  }

  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let invitationId: string
  let token: string

  if (!existingInvites.empty) {
    const doc = existingInvites.docs[0]
    invitationId = doc.id

    // Keep token stable for copy/paste links unless explicitly rotated via resend.
    token = (doc.data()?.token as string | undefined) || generateToken()

    await doc.ref.update({
      role,
      teamId,
      invitedBy: auth.uid,
      token,
      expiresAt,
      updatedAt: now,
    })
  } else {
    const tokenNew = generateToken()
    const inviteRef = db.collection('invitations').doc()
    invitationId = inviteRef.id
    token = tokenNew

    await inviteRef.set({
      organizationId,
      email,
      role,
      teamId,
      invitedBy: auth.uid,
      token: tokenNew,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      sendCount: 0,
      lastSentAt: null,
    })
  }

  const invitationUrl = buildInvitationUrl(invitationId, token)

  const sent = await sendInvitationEmail(
    {
    invitationId,
    organizationName,
    inviterName,
    inviterEmail,
    recipientEmail: email,
    role,
    teamName,
    invitationUrl,
    expiresAt: expiresAt.toDate(),
    },
    MAILER_SEND_KEY.value()
  )

  await db.collection('invitations').doc(invitationId).update({
    lastSentAt: now,
    sendCount: FieldValue.increment(1),
    updatedAt: now,
  })

  if (!sent) {
    throw new HttpsError('internal', 'Invitation created but email failed to send')
  }

  return {
    success: true,
    invitationId,
    invitationUrl, // used for copy/paste
  }
  }
)

export const resendInvitation = onCall(
  { region: 'europe-west2', secrets: [MAILER_SEND_KEY, MAIL_FROM_EMAIL] },
  async (request) => {
  const { auth, data } = request
  if (!auth?.uid || !auth.token?.email) {
    throw new HttpsError('unauthenticated', 'User must be authenticated')
  }

  const invitationId = String(data?.invitationId || '')
  const rotateToken = Boolean(data?.rotateToken)
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invitation ID is required')

  const db = getFirestore()
  const inviteRef = db.collection('invitations').doc(invitationId)
  const inviteSnap = await inviteRef.get()
  if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invitation not found')

  const invite = inviteSnap.data() || {}
  const organizationId = String(invite.organizationId || '')
  const email = normalizeEmail(invite.email)
  const role = (invite.role || 'member') as OrganizationRole
  const teamId = invite.teamId ? String(invite.teamId) : null

  await assertCanManageInvites(db, organizationId, auth.uid)

  if (invite.status !== 'pending') {
    throw new HttpsError('failed-precondition', `Cannot resend an invitation with status "${invite.status}"`)
  }

  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const token = rotateToken ? generateToken() : (String(invite.token || '') || generateToken())

  const orgSnap = await db.collection('organizations').doc(organizationId).get()
  const organizationName = (orgSnap.data()?.name as string | undefined) || 'your organization'

  let teamName: string | undefined
  if (teamId) {
    const teamSnap = await db.collection('organizations').doc(organizationId).collection('teams').doc(teamId).get()
    teamName = (teamSnap.data()?.name as string | undefined) || undefined
  }

  const inviterName = (auth.token?.name as string | undefined) || 'AICoder.Guru Admin'
  const inviterEmail = String(auth.token.email)

  await inviteRef.update({
    token,
    expiresAt,
    updatedAt: now,
  })

  const invitationUrl = buildInvitationUrl(invitationId, token)

  const sent = await sendInvitationEmail(
    {
    invitationId,
    organizationName,
    inviterName,
    inviterEmail,
    recipientEmail: email,
    role,
    teamName,
    invitationUrl,
    expiresAt: expiresAt.toDate(),
    },
    MAILER_SEND_KEY.value()
  )

  await inviteRef.update({
    lastSentAt: now,
    sendCount: FieldValue.increment(1),
    updatedAt: now,
  })

  if (!sent) throw new HttpsError('internal', 'Failed to resend invitation email')

    return { success: true, invitationUrl }
  }
)

export const revokeInvitation = onCall({ region: 'europe-west2' }, async (request) => {
  const { auth, data } = request
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'User must be authenticated')

  const invitationId = String(data?.invitationId || '')
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invitation ID is required')

  const db = getFirestore()
  const inviteRef = db.collection('invitations').doc(invitationId)
  const inviteSnap = await inviteRef.get()
  if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invitation not found')

  const invite = inviteSnap.data() || {}
  const organizationId = String(invite.organizationId || '')

  await assertCanManageInvites(db, organizationId, auth.uid)

  const now = Timestamp.now()
  await inviteRef.update({
    status: 'revoked',
    revokedAt: now,
    updatedAt: now,
  })

  return { success: true }
})

export const acceptInvitationByToken = onCall({ region: 'europe-west2' }, async (request) => {
  const { auth, data } = request
  if (!auth?.uid || !auth.token?.email) throw new HttpsError('unauthenticated', 'User must be authenticated')

  const invitationId = String(data?.invitationId || '')
  const token = String(data?.token || '')
  if (!invitationId || !token) throw new HttpsError('invalid-argument', 'Invitation ID and token are required')

  const db = getFirestore()
  const inviteRef = db.collection('invitations').doc(invitationId)

  console.log('🎫 acceptInvitationByToken request', {
    invitationId,
    uid: auth.uid,
    email: normalizeEmail(String(auth.token.email)),
  })

  try {
    await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef)
      if (!inviteSnap.exists) throw new HttpsError('not-found', 'Invitation not found')

      const invite = inviteSnap.data() || {}
      const inviteEmail = normalizeEmail(invite.email)
      const inviteToken = String(invite.token || '')
      const status = String(invite.status || '')
      const organizationId = String(invite.organizationId || '')
      const role = (invite.role || 'member') as OrganizationRole
      const teamId = invite.teamId ? String(invite.teamId) : null
      const acceptedBy = invite.acceptedBy ? String(invite.acceptedBy) : null

      const userEmail = normalizeEmail(String(auth.token.email))

      // If the user completed signup flow which already accepted the invite,
      // treat a second accept attempt as idempotent success.
      if (status === 'accepted' && acceptedBy === auth.uid) {
        console.log('✅ Invitation already accepted by this user; returning success', { invitationId })
        // Ensure user/org membership is still consistent (best-effort).
        const now = Timestamp.now()
        const userRef = db.collection('users').doc(auth.uid)
        const memberRef = db.collection('organizations').doc(organizationId).collection('members').doc(auth.uid)
        tx.set(
          memberRef,
          {
            userId: auth.uid,
            email: userEmail,
            role,
            teamId,
            status: 'active',
            updatedAt: now,
          },
          { merge: true }
        )
        tx.set(
          userRef,
          {
            organizationId,
            currentRole: role,
            tier: 'team',
            updatedAt: now,
          },
          { merge: true }
        )
        return
      }

      if (status !== 'pending') {
        console.warn('❌ Invitation not pending', { invitationId, status, acceptedBy })
        throw new HttpsError('failed-precondition', `Invitation is not pending (status: "${status}")`)
      }

      const now = Timestamp.now()
      const expiresAt: Timestamp =
        invite.expiresAt instanceof Timestamp ? invite.expiresAt : Timestamp.fromDate(new Date(invite.expiresAt))
      if (expiresAt.toMillis() < now.toMillis()) {
        console.warn('❌ Invitation expired', { invitationId, expiresAt: expiresAt.toMillis() })
        throw new HttpsError('failed-precondition', 'Invitation has expired')
      }

      if (inviteToken !== token) {
        console.warn('❌ Invitation token mismatch', { invitationId, inviteTokenLen: inviteToken.length, tokenLen: token.length })
        throw new HttpsError('permission-denied', 'Invalid invitation token')
      }

      if (userEmail !== inviteEmail) {
        console.warn('❌ Invitation email mismatch', { invitationId, inviteEmail, userEmail })
        throw new HttpsError('permission-denied', 'This invitation is for a different email address')
      }

      const userRef = db.collection('users').doc(auth.uid)
      const memberRef = db.collection('organizations').doc(organizationId).collection('members').doc(auth.uid)

      // Upsert member doc
      tx.set(
        memberRef,
        {
          userId: auth.uid,
          email: userEmail,
          displayName: (auth.token?.name as string | undefined) || '',
          role,
          teamId,
          joinedAt: now,
          status: 'active',
          invitedBy: String(invite.invitedBy || ''),
          invitedAt: invite.createdAt || now,
          updatedAt: now,
        },
        { merge: true }
      )

      // Ensure user is in org
      tx.set(
        userRef,
        {
          organizationId,
          currentRole: role,
          tier: 'team',
          updatedAt: now,
        },
        { merge: true }
      )

      // Mark invitation accepted
      tx.update(inviteRef, {
        status: 'accepted',
        acceptedBy: auth.uid,
        acceptedAt: now,
        updatedAt: now,
      })
    })
  } catch (err: any) {
    console.error('❌ acceptInvitationByToken failed', {
      invitationId,
      uid: auth.uid,
      email: normalizeEmail(String(auth.token.email)),
      error: err?.message || String(err),
      code: err?.code,
    })
    throw err
  }

  return { success: true }
})

