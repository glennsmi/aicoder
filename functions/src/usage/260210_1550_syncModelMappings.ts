import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getModelMappingSeeds, toModelMappingDocId } from '../shared'

const SUPER_ADMIN_EMAILS = new Set<string>(['glenn@aicoder.guru', 'glenn@fueld.ai'])

export const syncModelMappings = onCall({ cors: true, timeoutSeconds: 120 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const requesterEmail = String((request.auth.token as any)?.email || '').trim().toLowerCase()
  if (!requesterEmail || !SUPER_ADMIN_EMAILS.has(requesterEmail)) {
    throw new HttpsError('permission-denied', 'Super-admin access required')
  }

  const db = admin.firestore()
  const seeds = getModelMappingSeeds()
  const writeBatch = db.batch()

  for (const seed of seeds) {
    const ref = db.collection('modelMappings').doc(toModelMappingDocId(seed.canonicalName))
    writeBatch.set(
      ref,
      {
        canonicalName: seed.canonicalName,
        displayName: seed.displayName,
        aliasesBySource: seed.aliasesBySource,
        allAliases: seed.allAliases,
        sources: seed.sources,
        version: seed.version,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  await writeBatch.commit()

  return {
    ok: true,
    synced: seeds.length,
    canonicalModels: seeds.map((s) => s.canonicalName).sort(),
  }
})
