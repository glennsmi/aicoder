import { ledgerPreflight } from './ledgerPreflight'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'
import { validateClaudeRow } from '../shared/claudeLedger'

export const ingestClaudeLedger = onCall({ cors: true, timeoutSeconds: 300 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save Claude usage')
  if (!Array.isArray(request.data?.rows) || !request.data.rows.length || request.data.rows.length > 200)
    throw new HttpsError('invalid-argument', 'Send between 1 and 200 rows')
  if (request.data.checkOnly === true) return ledgerPreflight(request.auth.uid, 'claude_code_local', request.data.rows)
  let rows
  try { rows = request.data.rows.map(validateClaudeRow) }
  catch { throw new HttpsError('invalid-argument', 'Invalid Claude ledger') }
  const uid = request.auth.uid, db = admin.firestore()
  const user = (await db.doc(`users/${uid}`).get()).data()
  const org = user?.currentOrganizationId || user?.organizationId
  const membership = typeof org === 'string' ? await db.collection('organizations').doc(org).collection('members').doc(uid).get() : null
  const organizationId = membership?.exists ? org as string : undefined
  const teamId = membership?.data()?.teamId
  let saved = 0, duplicates = 0, updated = 0
  // Transaction makes retries idempotent and user/org copies atomic.
  for (const row of rows) {
    const eventId = createHash('sha256').update(`claude_code_local:${row.event_id}`).digest('hex')
    const ref = db.collection('users').doc(uid).collection('usageEvents').doc(eventId)
    const created = await db.runTransaction(async tx => {
      const existing = await tx.get(ref)
      if (existing.exists && Number(existing.data()?.tokens?.total) >= row.total_tokens) return 'duplicate'
      const doc = {
        eventId, userId: uid, provider: 'claude_code', sourceType: 'claude_code_local',
        ...(organizationId ? { organizationId } : {}), ...(typeof teamId === 'string' ? { teamId } : {}),
        eventAtMs: Date.parse(row.timestamp), day: row.timestamp.slice(0, 10),
        model: { name: row.model, expandedName: row.model },
        tokens: { total: row.total_tokens, input: row.input_tokens - row.cache_read_tokens,
          cacheRead: row.cache_read_tokens, cacheWrite: row.cache_write_tokens, output: row.output_tokens, hasBreakdown: true },
        cost: { hasCost: false, currency: 'USD' },
        labels: { streamType: 'local_upload', streamId: 'claude_code_local',
          ...(row.speed ? { speed: row.speed } : {}),
          ...(row.service_tier ? { serviceTier: row.service_tier } : {}) },
        source: { label: 'claude_code_local', importId: 'claude_code_local', providerEventId: row.event_id, fingerprint: eventId },
        raw: row, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      tx.set(ref, doc)
      if (organizationId) tx.set(db.collection('organizations').doc(organizationId).collection('usageEvents').doc(`${uid}_${eventId}`), doc)
      return existing.exists ? 'updated' : 'saved'
    })
    if (created === 'saved') saved++; else if (created === 'updated') updated++; else duplicates++
  }
  return { saved, duplicates, updated }
})
