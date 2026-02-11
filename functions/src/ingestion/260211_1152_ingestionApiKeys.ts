import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import crypto from 'node:crypto'

type IngestionApiKeyDoc = {
  keyPrefix: string
  keySuffix: string
  keyHash: string
  rawApiKey?: string
  scope: 'user'
  ownerUserId: string
  mappedUserId: string
  mappedOrganizationId?: string
  name: string
  status: 'active' | 'revoked'
  createdAt: FirebaseFirestore.FieldValue
  createdBy: string
  updatedAt: FirebaseFirestore.FieldValue
  revokedAt?: FirebaseFirestore.FieldValue
  revokedBy?: string
  lastUsedAt?: FirebaseFirestore.FieldValue
  lastUsedMeta?: {
    ip?: string
    userAgent?: string
  }
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

function buildApiKeyString(secret: string): string {
  return `ak_live_${secret}`
}

function generateSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function getPrefixFromRawKey(rawKey: string): string {
  return rawKey.slice(0, 18)
}

function getSuffixFromRawKey(rawKey: string): string {
  return rawKey.slice(-4)
}

async function assertOrgAdmin(db: FirebaseFirestore.Firestore, uid: string, organizationId: string): Promise<void> {
  const memberSnap = await db.collection('organizations').doc(organizationId).collection('members').doc(uid).get()
  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'You are not a member of this organization')
  }
  const role = String(memberSnap.data()?.role || '')
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only organization admins can manage other users keys')
  }
}

async function resolveTargetUser(
  db: FirebaseFirestore.Firestore,
  callerUid: string,
  requestedMappedUserId?: string
): Promise<{ mappedUserId: string; mappedOrganizationId?: string }> {
  const targetUserId = requestedMappedUserId && requestedMappedUserId.trim() ? requestedMappedUserId.trim() : callerUid
  if (targetUserId !== callerUid) {
    const [callerUserSnap, targetUserSnap] = await Promise.all([
      db.collection('users').doc(callerUid).get(),
      db.collection('users').doc(targetUserId).get(),
    ])
    if (!targetUserSnap.exists) {
      throw new HttpsError('not-found', 'Target mapped user does not exist')
    }

    const callerOrgId = typeof callerUserSnap.data()?.organizationId === 'string'
      ? String(callerUserSnap.data()?.organizationId)
      : undefined
    const targetOrgId = typeof targetUserSnap.data()?.organizationId === 'string'
      ? String(targetUserSnap.data()?.organizationId)
      : undefined
    if (!callerOrgId || !targetOrgId || callerOrgId !== targetOrgId) {
      throw new HttpsError('permission-denied', 'You can only issue keys for users in your organization')
    }
    await assertOrgAdmin(db, callerUid, callerOrgId)
    return { mappedUserId: targetUserId, mappedOrganizationId: targetOrgId }
  }

  const userSnap = await db.collection('users').doc(targetUserId).get()
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User not found')
  }
  const mappedOrganizationId =
    typeof userSnap.data()?.organizationId === 'string' ? String(userSnap.data()?.organizationId) : undefined
  return { mappedUserId: targetUserId, mappedOrganizationId }
}

export const createIngestionApiKey = onCall({ region: 'europe-west2' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const callerUid = request.auth.uid
  const name = String(request.data?.name || 'Default ingestion key').trim().slice(0, 120) || 'Default ingestion key'
  const requestedMappedUserId = typeof request.data?.mappedUserId === 'string'
    ? request.data.mappedUserId
    : undefined

  const db = admin.firestore()
  const { mappedUserId, mappedOrganizationId } = await resolveTargetUser(db, callerUid, requestedMappedUserId)

  const secret = generateSecret()
  const rawKey = buildApiKeyString(secret)
  const keyPrefix = getPrefixFromRawKey(rawKey)
  const keySuffix = getSuffixFromRawKey(rawKey)
  const keyHash = hashApiKey(rawKey)
  const keyRef = db.collection('ingestionApiKeys').doc()

  const payload: IngestionApiKeyDoc = {
    keyPrefix,
    keySuffix,
    keyHash,
    rawApiKey: rawKey,
    scope: 'user',
    ownerUserId: callerUid,
    mappedUserId,
    ...(mappedOrganizationId ? { mappedOrganizationId } : {}),
    name,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: callerUid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await keyRef.set(payload)

  return {
    keyId: keyRef.id,
    apiKey: rawKey,
    keyPrefix,
    keySuffix,
    mappedUserId,
    mappedOrganizationId: mappedOrganizationId ?? null,
    status: 'active',
    warning: 'This is the only time the full API key is shown. Store it securely now.',
  }
})

export const listIngestionApiKeys = onCall({ region: 'europe-west2' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const callerUid = request.auth.uid
  const requestedOrganizationId = typeof request.data?.organizationId === 'string'
    ? request.data.organizationId.trim()
    : ''
  const db = admin.firestore()

  let snapshots: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>[] = []
  if (requestedOrganizationId) {
    await assertOrgAdmin(db, callerUid, requestedOrganizationId)
    const orgSnap = await db
      .collection('ingestionApiKeys')
      .where('mappedOrganizationId', '==', requestedOrganizationId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get()
    snapshots = [orgSnap]
  } else {
    const [owned, mapped] = await Promise.all([
      db.collection('ingestionApiKeys').where('ownerUserId', '==', callerUid).orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('ingestionApiKeys').where('mappedUserId', '==', callerUid).orderBy('createdAt', 'desc').limit(100).get(),
    ])
    snapshots = [owned, mapped]
  }

  const deduped = new Map<string, Record<string, unknown>>()
  for (const snapshot of snapshots) {
    snapshot.forEach((doc) => {
      const data = doc.data()
      deduped.set(doc.id, {
        keyId: doc.id,
        keyPrefix: data.keyPrefix,
        keySuffix: data.keySuffix ?? null,
        name: data.name,
        status: data.status,
        scope: data.scope,
        ownerUserId: data.ownerUserId,
        mappedUserId: data.mappedUserId,
        mappedOrganizationId: data.mappedOrganizationId ?? null,
        createdBy: data.createdBy,
        createdAt: data.createdAt ?? null,
        lastUsedAt: data.lastUsedAt ?? null,
        revokedAt: data.revokedAt ?? null,
      })
    })
  }

  return { keys: Array.from(deduped.values()) }
})

export const revokeIngestionApiKey = onCall({ region: 'europe-west2' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const callerUid = request.auth.uid
  const keyId = String(request.data?.keyId || '').trim()
  if (!keyId) {
    throw new HttpsError('invalid-argument', 'keyId is required')
  }

  const db = admin.firestore()
  const keyRef = db.collection('ingestionApiKeys').doc(keyId)
  const keySnap = await keyRef.get()
  if (!keySnap.exists) {
    throw new HttpsError('not-found', 'Ingestion API key not found')
  }
  const data = keySnap.data() as Record<string, unknown>

  const ownerUserId = String(data.ownerUserId || '')
  const mappedUserId = String(data.mappedUserId || '')
  const mappedOrganizationId = typeof data.mappedOrganizationId === 'string'
    ? String(data.mappedOrganizationId)
    : undefined

  const callerIsDirectOwner = callerUid === ownerUserId || callerUid === mappedUserId
  if (!callerIsDirectOwner) {
    if (!mappedOrganizationId) {
      throw new HttpsError('permission-denied', 'Only owner can revoke this key')
    }
    await assertOrgAdmin(db, callerUid, mappedOrganizationId)
  }

  await keyRef.set(
    {
      status: 'revoked',
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      revokedBy: callerUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return { success: true, keyId, status: 'revoked' }
})

export const revealIngestionApiKey = onCall({ region: 'europe-west2' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const callerUid = request.auth.uid
  const keyId = String(request.data?.keyId || '').trim()
  if (!keyId) {
    throw new HttpsError('invalid-argument', 'keyId is required')
  }

  const db = admin.firestore()
  const keyRef = db.collection('ingestionApiKeys').doc(keyId)
  const keySnap = await keyRef.get()
  if (!keySnap.exists) {
    throw new HttpsError('not-found', 'Ingestion API key not found')
  }
  const data = keySnap.data() as Record<string, unknown>
  const ownerUserId = String(data.ownerUserId || '')
  const mappedUserId = String(data.mappedUserId || '')
  const mappedOrganizationId = typeof data.mappedOrganizationId === 'string'
    ? String(data.mappedOrganizationId)
    : undefined
  const callerIsDirectOwner = callerUid === ownerUserId || callerUid === mappedUserId
  if (!callerIsDirectOwner) {
    if (!mappedOrganizationId) {
      throw new HttpsError('permission-denied', 'Only owner can reveal this key')
    }
    await assertOrgAdmin(db, callerUid, mappedOrganizationId)
  }

  const rawApiKey = typeof data.rawApiKey === 'string' ? data.rawApiKey : ''
  if (!rawApiKey) {
    throw new HttpsError('failed-precondition', 'This key cannot be revealed')
  }
  return {
    keyId,
    apiKey: rawApiKey,
    keyPrefix: data.keyPrefix,
    keySuffix: data.keySuffix ?? null,
  }
})

export async function verifyIngestionApiKey(
  db: FirebaseFirestore.Firestore,
  rawKey: string
): Promise<{
  keyId: string
  mappedUserId: string
  mappedOrganizationId?: string
  keyPrefix: string
}> {
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = getPrefixFromRawKey(rawKey)

  const query = await db
    .collection('ingestionApiKeys')
    .where('keyPrefix', '==', keyPrefix)
    .where('status', '==', 'active')
    .limit(20)
    .get()

  const matchingDoc = query.docs.find((doc) => String(doc.data().keyHash || '') === keyHash)
  if (!matchingDoc) {
    throw new HttpsError('unauthenticated', 'Invalid API key')
  }

  const data = matchingDoc.data() as Record<string, unknown>
  const mappedUserId = String(data.mappedUserId || '')
  if (!mappedUserId) {
    throw new HttpsError('permission-denied', 'API key is missing user mapping')
  }

  await matchingDoc.ref.set(
    {
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return {
    keyId: matchingDoc.id,
    mappedUserId,
    mappedOrganizationId:
      typeof data.mappedOrganizationId === 'string' ? String(data.mappedOrganizationId) : undefined,
    keyPrefix: String(data.keyPrefix || keyPrefix),
  }
}
