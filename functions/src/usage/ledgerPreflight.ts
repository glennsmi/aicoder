import { HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { createHash } from 'node:crypto'

/** Check exact identities, not dates: old sessions can receive new usage. */
export async function ledgerPreflight(uid: string, source: 'codex_local' | 'claude_code_local', rows: unknown[]) {
  const entries = rows.map(value => {
    const row = value as { event_id?: unknown; total_tokens?: unknown }
    if (!row || typeof row.event_id !== 'string' || !row.event_id.length || row.event_id.length > 500 ||
        typeof row.total_tokens !== 'number' || !Number.isSafeInteger(row.total_tokens) || row.total_tokens < 0)
      throw new HttpsError('invalid-argument', 'Invalid usage checkpoint')
    return { id: row.event_id, total: row.total_tokens }
  })
  const db = admin.firestore()
  const refs = entries.map(row => db.collection('users').doc(uid).collection('usageEvents')
    .doc(createHash('sha256').update(`${source}:${row.id}`).digest('hex')))
  const snapshots = await db.getAll(...refs)
  return { needed: entries.filter((row, i) => !snapshots[i].exists ||
    (source === 'claude_code_local' && Number(snapshots[i].data()?.tokens?.total ?? -1) < row.total)).map(row => row.id) }
}
