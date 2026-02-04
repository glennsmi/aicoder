import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import crypto from 'node:crypto'
import { CursorUsageV2, TokenBreakdown } from '../shared'

type IngestCursorCsvRequest = {
  importId?: string
  fileName?: string
  fileHash?: string
  rows: CursorUsageV2[]
}

type IngestCursorCsvResponse = {
  importId: string
  saved: number
  duplicates: number
  minEventAtMs?: number
  maxEventAtMs?: number
  models: string[]
}

function sha256Base64Url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('base64')
  // base64url-ish (Firestore doc ids are fine with +/ but we keep it url-safe)
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function toDayUtc(eventAtMs: number): string {
  return new Date(eventAtMs).toISOString().slice(0, 10)
}

function costUsdToMicros(costUsd: number): number {
  // Avoid floats in storage; rounding is OK for micros.
  return Math.round(costUsd * 1_000_000)
}

function extractTokens(row: CursorUsageV2): {
  total: number
  hasBreakdown: boolean
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  other?: Record<string, number>
} {
  const total = Number(row.tokens) || 0
  const tb: TokenBreakdown | undefined = row.tokenBreakdown

  if (!tb) {
    return { total, hasBreakdown: false }
  }

  const inputWithCacheWrite = Number(tb.inputWithCacheWrite) || 0
  const inputWithoutCacheWrite = Number(tb.inputWithoutCacheWrite) || 0
  const cacheRead = Number(tb.cacheRead) || 0
  const output = Number(tb.output) || 0

  return {
    total: Number(tb.total) || total,
    hasBreakdown: true,
    input: inputWithCacheWrite + inputWithoutCacheWrite,
    output,
    cacheRead,
    cacheWrite: inputWithCacheWrite,
    other: {
      cursorInputWithCacheWrite: inputWithCacheWrite,
      cursorInputWithoutCacheWrite: inputWithoutCacheWrite,
    },
  }
}

function buildFingerprint(input: {
  provider: string
  sourceType: string
  eventAtMs: number
  modelName: string
  tokens: ReturnType<typeof extractTokens>
  cost: { hasCost: boolean; amountMicros?: number }
}): string {
  const parts = [
    input.provider,
    input.sourceType,
    String(input.eventAtMs),
    input.modelName.trim(),
    String(input.tokens.total),
    String(input.tokens.input ?? ''),
    String(input.tokens.output ?? ''),
    String(input.tokens.cacheRead ?? ''),
    String(input.tokens.cacheWrite ?? ''),
    input.cost.hasCost ? String(input.cost.amountMicros ?? 0) : 'no-cost',
  ]

  // Include the "other" token buckets deterministically (sorted keys)
  if (input.tokens.other) {
    const keys = Object.keys(input.tokens.other).sort()
    for (const k of keys) {
      parts.push(`${k}=${String(input.tokens.other[k] ?? 0)}`)
    }
  }

  return sha256Base64Url(parts.join('|'))
}

export const ingestUsageEventsFromCursorCsv = onCall(
  { cors: true },
  async (request): Promise<IngestCursorCsvResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const uid = request.auth.uid
    const data = request.data as Partial<IngestCursorCsvRequest>

    if (!data || !Array.isArray(data.rows)) {
      throw new HttpsError('invalid-argument', 'rows[] is required')
    }

    const rows = data.rows
    if (rows.length === 0) {
      throw new HttpsError('invalid-argument', 'rows[] must not be empty')
    }

    // Guardrail: avoid huge callable payloads by enforcing a chunk limit.
    if (rows.length > 5000) {
      throw new HttpsError('invalid-argument', 'Too many rows in one request; send in chunks')
    }

    const importId = (data.importId && String(data.importId)) || `cursor_csv_${Date.now()}`
    const fileName = data.fileName ? String(data.fileName) : undefined
    const fileHash = data.fileHash ? String(data.fileHash) : undefined

    const db = admin.firestore()

    // File-hash import guard:
    // If the exact same file (same sha256 hash) is uploaded again, skip ingest entirely.
    // This avoids thousands of duplicate "already exists" writes.
    const nowMs = Date.now()
    const importGuardRef =
      fileHash ? db.collection('users').doc(uid).collection('usageEventImports').doc(fileHash) : null
    if (importGuardRef) {
      const guardResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(importGuardRef)
        const existing = snap.exists ? (snap.data() as any) : undefined
        const status = existing?.status

        if (status === 'complete') {
          return { skip: true }
        }

        const startedAtMs = typeof existing?.startedAtMs === 'number' ? Number(existing.startedAtMs) : undefined
        const inProgressStaleMs = 30 * 60 * 1000
        const inProgressFresh = status === 'in_progress' && startedAtMs && nowMs - startedAtMs < inProgressStaleMs

        if (inProgressFresh) {
          return { skip: true }
        }

        tx.set(
          importGuardRef,
          {
            fileHash,
            ...(fileName ? { fileName } : {}),
            importId,
            status: 'in_progress',
            startedAtMs: nowMs,
            updatedAtMs: nowMs,
            rowCount: rows.length,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

        return { skip: false }
      })

      if (guardResult.skip) {
        return {
          importId,
          saved: 0,
          duplicates: rows.length,
          models: [],
        }
      }
    }

    // Resolve organization/team (single team today)
    const userSnap = await db.collection('users').doc(uid).get()
    const userDoc = userSnap.exists ? (userSnap.data() as any) : undefined
    const organizationId: string | undefined =
      userDoc?.organizationId && typeof userDoc.organizationId === 'string'
        ? userDoc.organizationId
        : undefined

    let teamId: string | undefined
    if (organizationId) {
      const memberSnap = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(uid)
        .get()
      const memberDoc = memberSnap.exists ? (memberSnap.data() as any) : undefined
      if (memberDoc?.teamId && typeof memberDoc.teamId === 'string') {
        teamId = memberDoc.teamId
      }
    }

    const bulkWriter = db.bulkWriter()

    let saved = 0
    let duplicates = 0
    let minEventAtMs: number | undefined
    let maxEventAtMs: number | undefined
    const models = new Set<string>()

    bulkWriter.onWriteError((err) => {
      // Continue on already-exists duplicates.
      // Firestore Admin errors expose status as a number or string depending on environment.
      const status: any = (err as any).status || (err as any).code
      if (status === 6 || status === 'ALREADY_EXISTS' || status === 'already-exists') {
        duplicates += 1
        return true
      }
      console.error('BulkWriter error:', err)
      // For non-duplicate errors, stop retrying and surface the failure.
      return false
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      const eventAtMs = Number(row.timestamp)
      if (!Number.isFinite(eventAtMs) || eventAtMs <= 0) {
        continue
      }

      const modelName = String(row.model || '').trim()
      if (!modelName) continue

      models.add(modelName)

      const tokens = extractTokens(row)

      const costHasCost = typeof row.costUsd === 'number' && Number.isFinite(row.costUsd)
      const costAmountMicros = costHasCost ? costUsdToMicros(row.costUsd as number) : undefined

      const fingerprint = buildFingerprint({
        provider: 'cursor',
        sourceType: 'csv',
        eventAtMs,
        modelName,
        tokens,
        cost: { hasCost: costHasCost, amountMicros: costAmountMicros },
      })

      const eventId = fingerprint

      const docRef = db.collection('users').doc(uid).collection('usageEvents').doc(eventId)

      const doc: Record<string, unknown> = {
        eventId,
        userId: uid,
        provider: 'cursor',
        sourceType: 'csv',
        eventAtMs,
        day: toDayUtc(eventAtMs),
        model: { name: modelName },
        tokens,
        cost: {
          hasCost: costHasCost,
          currency: 'USD',
          ...(costHasCost ? { amountMicros: costAmountMicros } : {}),
        },
        source: {
          importId,
          ...(fileName ? { fileName } : {}),
          ...(fileHash ? { fileHash } : {}),
          rowIndex: i,
          fingerprint,
        },
        // Server timestamp
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      if (organizationId) doc.organizationId = organizationId
      if (teamId) doc.teamId = teamId
      if (row.raw && typeof row.raw === 'object') doc.raw = row.raw

      bulkWriter.create(docRef, doc)
        .then(() => {
          saved += 1
          if (minEventAtMs === undefined || eventAtMs < minEventAtMs) minEventAtMs = eventAtMs
          if (maxEventAtMs === undefined || eventAtMs > maxEventAtMs) maxEventAtMs = eventAtMs
        })
        .catch((e) => {
          // write errors are handled via onWriteError where possible
          console.error('Write failed:', e)
        })
    }

    await bulkWriter.close()

    // Mark import guard complete (best effort)
    if (importGuardRef) {
      try {
        await importGuardRef.set(
          {
            status: 'complete',
            completedAtMs: Date.now(),
            updatedAtMs: Date.now(),
            saved,
            duplicates,
          },
          { merge: true }
        )
      } catch (e) {
        console.error('Failed to finalize import guard:', e)
      }
    }

    return {
      importId,
      saved,
      duplicates,
      minEventAtMs,
      maxEventAtMs,
      models: Array.from(models).sort(),
    }
  }
)

