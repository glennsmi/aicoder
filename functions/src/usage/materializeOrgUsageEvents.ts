import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

type MaterializeOrgUsageEventsRequest = {
  /**
   * Optional override. If omitted, we use org.settings.dataRetentionDays (fallback 365).
   */
  retentionDays?: number
  /**
   * Optional override (UTC ms). If provided, takes precedence over retentionDays.
   */
  startMs?: number
  /**
   * Optional override (UTC ms). Defaults to now.
   */
  endMs?: number
}

type MaterializeOrgUsageEventsResponse = {
  organizationId: string
  startMs: number
  endMs: number
  scannedUsers: number
  scannedEvents: number
  created: number
  duplicates: number
}

function toMillis(v: any): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return v.getTime()
  if (v && typeof v.toMillis === 'function') {
    const ms = Number(v.toMillis())
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

export const materializeOrgUsageEvents = onCall(
  {
    cors: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request): Promise<MaterializeOrgUsageEventsResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const uid = request.auth.uid
    const data = (request.data || {}) as Partial<MaterializeOrgUsageEventsRequest>
    const db = admin.firestore()

    const userSnap = await db.collection('users').doc(uid).get()
    const userDoc = userSnap.exists ? (userSnap.data() as any) : undefined
    const organizationId: string | undefined =
      userDoc?.organizationId && typeof userDoc.organizationId === 'string' ? userDoc.organizationId : undefined

    if (!organizationId) {
      throw new HttpsError('failed-precondition', 'User is not in an organization')
    }

    // Ensure caller is an active org member
    const memberSnap = await db.collection('organizations').doc(organizationId).collection('members').doc(uid).get()
    const memberDoc = memberSnap.exists ? (memberSnap.data() as any) : undefined
    if (!memberSnap.exists || memberDoc?.status !== 'active') {
      throw new HttpsError('permission-denied', 'Not an active organization member')
    }

    // Determine backfill window
    const nowMs = Date.now()
    const endMs = typeof data.endMs === 'number' && Number.isFinite(data.endMs) ? Number(data.endMs) : nowMs

    let startMs: number
    if (typeof data.startMs === 'number' && Number.isFinite(data.startMs)) {
      startMs = Number(data.startMs)
    } else {
      let retentionDays =
        typeof data.retentionDays === 'number' && Number.isFinite(data.retentionDays)
          ? Math.max(1, Math.min(3650, Math.floor(data.retentionDays)))
          : undefined

      if (!retentionDays) {
        const orgSnap = await db.collection('organizations').doc(organizationId).get()
        const orgDoc = orgSnap.exists ? (orgSnap.data() as any) : undefined
        const settingsRetention = Number(orgDoc?.settings?.dataRetentionDays)
        retentionDays =
          Number.isFinite(settingsRetention) && settingsRetention > 0
            ? Math.max(1, Math.min(3650, Math.floor(settingsRetention)))
            : 365
      }

      startMs = endMs - retentionDays * 24 * 60 * 60 * 1000
    }

    // Load members
    const membersSnap = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('members')
      .where('status', '==', 'active')
      .get()

    const memberIds = membersSnap.docs.map((d) => d.id)

    const bulkWriter = db.bulkWriter()
    let created = 0
    let duplicates = 0
    let scannedEvents = 0

    bulkWriter.onWriteError((err) => {
      const status: any = (err as any).status || (err as any).code
      if (status === 6 || status === 'ALREADY_EXISTS' || status === 'already-exists') {
        duplicates += 1
        return true
      }
      console.error('BulkWriter error:', err)
      return false
    })

    for (const memberId of memberIds) {
      // Page through each user's usageEvents (range filter only; orgId mismatch is filtered in code)
      const ref = db.collection('users').doc(memberId).collection('usageEvents')
      let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null

      while (true) {
        let q: FirebaseFirestore.Query = ref.where('eventAtMs', '>=', startMs).where('eventAtMs', '<', endMs).orderBy('eventAtMs', 'desc').limit(1000)
        if (cursor) q = q.startAfter(cursor)

        const snap = await q.get()
        if (snap.empty) break

        for (const d of snap.docs) {
          scannedEvents += 1
          const ev: any = d.data()
          if (ev?.organizationId !== organizationId) continue

          const eventId = String(ev?.eventId || d.id)
          const orgEventId = `${memberId}_${eventId}`
          const orgRef = db.collection('organizations').doc(organizationId).collection('usageEvents').doc(orgEventId)

          // Normalize a couple of fields defensively (ensure numeric timestamps)
          const eventAtMs = toMillis(ev?.eventAtMs) ?? Number(ev?.eventAtMs)
          const normalized: Record<string, unknown> = {
            ...ev,
            orgEventId,
            eventId,
            userId: String(ev?.userId || memberId),
            eventAtMs: typeof eventAtMs === 'number' && Number.isFinite(eventAtMs) ? eventAtMs : ev?.eventAtMs,
          }

          bulkWriter.create(orgRef, normalized).then(() => {
            created += 1
          }).catch(() => {
            // handled by onWriteError for duplicates
          })
        }

        cursor = snap.docs[snap.docs.length - 1] ?? null
        if (snap.size < 1000) break
      }
    }

    await bulkWriter.close()

    return {
      organizationId,
      startMs,
      endMs,
      scannedUsers: memberIds.length,
      scannedEvents,
      created,
      duplicates,
    }
  }
)

