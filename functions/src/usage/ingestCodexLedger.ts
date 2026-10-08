import { ledgerPreflight } from './ledgerPreflight'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'
import { validateCodexRow } from '../shared/codexLedger'

export const ingestCodexLedger = onCall({ cors: true, timeoutSeconds: 300 }, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save Codex usage')
  if (!Array.isArray(request.data?.rows) || !request.data.rows.length || request.data.rows.length > 200)
    throw new HttpsError('invalid-argument', 'Send between 1 and 200 rows')
  if (request.data.checkOnly === true) return ledgerPreflight(request.auth.uid, 'codex_local', request.data.rows)
  let rows
  try { rows = request.data.rows.map(validateCodexRow) }
  catch { throw new HttpsError('invalid-argument', 'Invalid Codex ledger') }
  const uid = request.auth.uid, db = admin.firestore()
  const user = (await db.doc(`users/${uid}`).get()).data()
  const org = user?.currentOrganizationId || user?.organizationId
  const membership = typeof org === 'string' ? await db.collection('organizations').doc(org).collection('members').doc(uid).get() : null
  const organizationId = membership?.exists ? org as string : undefined
  const teamId = membership?.data()?.teamId
  let saved = 0, duplicates = 0
  // Transaction makes retries idempotent and user/org copies atomic.
  for (const row of rows) {
    const eventId = createHash('sha256').update(`codex_local:${row.event_id}`).digest('hex')
    const ref = db.collection('users').doc(uid).collection('usageEvents').doc(eventId)
    const created = await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return false
      const doc = {
        eventId, userId: uid, provider: 'openai', sourceType: 'codex_local',
        ...(organizationId ? { organizationId } : {}), ...(typeof teamId === 'string' ? { teamId } : {}),
        eventAtMs: Date.parse(row.timestamp), day: row.timestamp.slice(0, 10),
        model: { name: row.model, expandedName: row.model },
        tokens: { total: row.total_tokens, input: row.input_tokens - row.cache_read_tokens,
          cacheRead: row.cache_read_tokens, cacheWrite: row.cache_write_tokens, output: row.output_tokens, hasBreakdown: true },
        cost: { hasCost: false, currency: 'USD' },
        labels: { streamType: 'local_upload', streamId: 'codex_local',
          ...(row.reasoning_effort ? { reasoningEffort: row.reasoning_effort } : {}),
          ...(row.service_tier ? { serviceTier: row.service_tier } : {}) },
        source: { label: 'codex_local', importId: 'codex_local', providerEventId: row.event_id, fingerprint: eventId },
        raw: row, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      tx.create(ref, doc)
      if (organizationId) tx.create(db.collection('organizations').doc(organizationId).collection('usageEvents').doc(`${uid}_${eventId}`), doc)
      return true
    })
    if (created) saved++; else duplicates++
  }
  return { saved, duplicates }
})
