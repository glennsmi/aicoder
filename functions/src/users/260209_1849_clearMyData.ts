import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

type ClearMyDataRequest = {
  confirm?: string
}

type DeleteSummary = {
  deleted: Record<string, number>
  orgUsageEventsDeleted?: number
}

async function deleteQueryInBatches(q: FirebaseFirestore.Query, batchSize = 500): Promise<number> {
  let deleted = 0
  while (true) {
    const snap = await q.limit(batchSize).get()
    if (snap.empty) break
    const batch = admin.firestore().batch()
    for (const doc of snap.docs) batch.delete(doc.ref)
    await batch.commit()
    deleted += snap.size
    if (snap.size < batchSize) break
  }
  return deleted
}

async function deleteUserSubcollection(uid: string, subcollection: string): Promise<number> {
  const ref = admin.firestore().collection(`users/${uid}/${subcollection}`)
  // Use an un-ordered query to avoid requiring indexes/fields.
  return deleteQueryInBatches(ref)
}

function timestampToMs(v: any): number | null {
  if (!v) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null
  if (typeof v.toMillis === 'function') {
    const ms = Number(v.toMillis())
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

export const clearMyData = onCall({ region: 'europe-west2' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.')

  const confirm = String((request.data as ClearMyDataRequest | undefined)?.confirm || '').trim().toUpperCase()
  if (confirm !== 'CLEAR') throw new HttpsError('invalid-argument', 'Type CLEAR to confirm.')

  // Require a recent login (best-effort).
  const authTimeSec = (request.auth?.token as any)?.auth_time
  const nowSec = Math.floor(Date.now() / 1000)
  if (typeof authTimeSec === 'number' && nowSec - authTimeSec > 10 * 60) {
    throw new HttpsError('failed-precondition', 'Recent login required. Please sign out and sign back in, then retry.')
  }

  const userRef = admin.firestore().doc(`users/${uid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new HttpsError('not-found', 'User record not found.')

  const userData: any = userSnap.data() || {}
  const experimental = userData?.settings?.experimental || {}
  const enabledAtMs = timestampToMs(experimental?.clearDataEnabledAt)
  if (!enabledAtMs || Date.now() - enabledAtMs > 15 * 60 * 1000) {
    throw new HttpsError(
      'failed-precondition',
      'Clear-data is disabled. Go to Account Settings → Danger Zone → Enable clear-data (15 min), then retry.'
    )
  }

  const deleted: Record<string, number> = {}
  const subcollections = [
    'usageEvents',
    'usageEventImports',
    'cursorUsage',
    'aggregatedUsage',
    'enhancedAggregatedUsage',
    'rawUsage',
    'enhancedRawUsage',
    // Legacy/compat probes
    'enhanced_cursor_usage',
  ]

  for (const sub of subcollections) {
    try {
      deleted[sub] = await deleteUserSubcollection(uid, sub)
    } catch (e) {
      // If a subcollection doesn't exist or delete fails, surface it as 0 but continue.
      deleted[sub] = deleted[sub] ?? 0
    }
  }

  // Best-effort: remove org-scoped usage events for this user in their current org.
  let orgUsageEventsDeleted = 0
  const orgId = typeof userData?.organizationId === 'string' ? userData.organizationId : null
  if (orgId) {
    try {
      const orgEvents = admin.firestore().collection(`organizations/${orgId}/usageEvents`).where('userId', '==', uid)
      orgUsageEventsDeleted = await deleteQueryInBatches(orgEvents)
    } catch {
      orgUsageEventsDeleted = 0
    }
  }

  await userRef.set(
    {
      settings: {
        experimental: {
          clearDataEnabledAt: admin.firestore.FieldValue.delete(),
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  const total =
    Object.values(deleted).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0) +
    (Number.isFinite(orgUsageEventsDeleted) ? orgUsageEventsDeleted : 0)

  const summary: DeleteSummary = { deleted, orgUsageEventsDeleted }
  return {
    ok: true,
    summary: `Deleted ${total.toLocaleString()} documents.`,
    details: summary,
  }
})

