import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import crypto from 'node:crypto'
import {
  CursorUsageV2,
  ModelResolutionMatchType,
  resolveCanonicalModelNameWithDiagnostics,
  TokenBreakdown,
  MODEL_MAPPING_VERSION,
  normalizeModelMappingSourceKey,
  sourceAliasFieldName,
  toDisplayModelName,
  toModelMappingDocId,
} from '../shared'
import { sendAdminNotification } from '../utils/email'

type IngestCcusageDailyRequest = {
  importId?: string
  fileName?: string
  fileHash?: string
  rows: CursorUsageV2[]
}

type IngestCcusageDailyResponse = {
  importId: string
  saved: number
  duplicates: number
  minEventAtMs?: number
  maxEventAtMs?: number
  models: string[]
  mappingDiagnostics: {
    source: string
    rowsEvaluated: number
    matchedRows: number
    unmatchedRows: number
    matchTypeCounts: Record<ModelResolutionMatchType, number>
    unmatchedModels: Array<{
      rawModelName: string
      canonicalSuggestion: string
      source: string
      occurrences: number
    }>
  }
}

function sha256Base64Url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('base64')
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function toDayUtc(eventAtMs: number): string {
  return new Date(eventAtMs).toISOString().slice(0, 10)
}

function costUsdToMicros(costUsd: number): number {
  return Math.round(costUsd * 1_000_000)
}

type MappingObservation = {
  canonicalName: string
  sourceKey: ReturnType<typeof normalizeModelMappingSourceKey>
  aliases: Set<string>
}

async function persistModelMappingObservations(
  db: FirebaseFirestore.Firestore,
  observations: Map<string, MappingObservation>
): Promise<void> {
  if (observations.size === 0) return
  const writeBatch = db.batch()
  for (const observation of observations.values()) {
    const canonicalName = String(observation.canonicalName || '').trim().toLowerCase()
    if (!canonicalName) continue
    const aliases = Array.from(observation.aliases).map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)
    const docRef = db.collection('modelMappings').doc(toModelMappingDocId(canonicalName))
    const sourceAliasField = sourceAliasFieldName(observation.sourceKey)
    const payload: Record<string, unknown> = {
      canonicalName,
      displayName: toDisplayModelName(canonicalName),
      version: MODEL_MAPPING_VERSION,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      allAliases: admin.firestore.FieldValue.arrayUnion(canonicalName, ...aliases),
      sources: admin.firestore.FieldValue.arrayUnion(observation.sourceKey),
    }
    if (sourceAliasField) {
      payload[`aliasesBySource.${sourceAliasField}`] =
        aliases.length > 0
          ? admin.firestore.FieldValue.arrayUnion(...aliases)
          : admin.firestore.FieldValue.arrayUnion(canonicalName)
    }
    writeBatch.set(docRef, payload, { merge: true })
  }
  await writeBatch.commit()
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
    // In ccusage terminology this represents cache creation tokens (input-side).
    cacheWrite: inputWithCacheWrite,
    other: {
      ccusageCacheCreationTokens: inputWithCacheWrite,
      ccusageInputTokens: inputWithoutCacheWrite,
    },
  }
}

function buildFingerprint(input: {
  provider: string
  sourceType: string
  eventAtMs: number
  modelName: string
  expandedModelName: string
  tokens: ReturnType<typeof extractTokens>
  cost: { hasCost: boolean; amountMicros?: number }
}): string {
  const parts = [
    input.provider,
    input.sourceType,
    String(input.eventAtMs),
    input.modelName.trim(),
    input.expandedModelName.trim(),
    String(input.tokens.total),
    String(input.tokens.input ?? ''),
    String(input.tokens.output ?? ''),
    String(input.tokens.cacheRead ?? ''),
    String(input.tokens.cacheWrite ?? ''),
    input.cost.hasCost ? String(input.cost.amountMicros ?? 0) : 'no-cost',
  ]

  if (input.tokens.other) {
    const keys = Object.keys(input.tokens.other).sort()
    for (const k of keys) {
      parts.push(`${k}=${String(input.tokens.other[k] ?? 0)}`)
    }
  }

  return sha256Base64Url(parts.join('|'))
}

export const ingestUsageEventsFromCcusageDailyJson = onCall(
  { cors: true, timeoutSeconds: 300 },
  async (request): Promise<IngestCcusageDailyResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const uid = request.auth.uid
    const data = request.data as Partial<IngestCcusageDailyRequest>

    if (!data || !Array.isArray(data.rows)) {
      throw new HttpsError('invalid-argument', 'rows[] is required')
    }

    const rows = data.rows
    if (rows.length === 0) {
      throw new HttpsError('invalid-argument', 'rows[] must not be empty')
    }

    if (rows.length > 5000) {
      throw new HttpsError('invalid-argument', 'Too many rows in one request; send in chunks')
    }

    const importId = (data.importId && String(data.importId)) || `ccusage_daily_${Date.now()}`
    const fileName = data.fileName ? String(data.fileName) : undefined
    const fileHash = data.fileHash ? String(data.fileHash) : undefined

    const db = admin.firestore()

    // File-hash import guard (same pattern as Cursor CSV ingest).
    // See ingestUsageEventsFromCursorCsv.ts for full notes on the multi-chunk
    // continuation rule: chunks of a single upload share `importId`, so a guard
    // doc whose `importId` matches the incoming `importId` is a continuation,
    // not a re-upload, and must NOT be skipped.
    const nowMs = Date.now()
    const importGuardRef =
      fileHash ? db.collection('users').doc(uid).collection('usageEventImports').doc(fileHash) : null

    if (importGuardRef) {
      const guardResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(importGuardRef)
        const existing = snap.exists ? (snap.data() as any) : undefined
        const status = existing?.status
        const existingImportId =
          typeof existing?.importId === 'string' ? (existing.importId as string) : undefined

        // Continuation of the SAME upload session (next chunk). Always allow.
        if (existingImportId && existingImportId === importId) {
          tx.set(
            importGuardRef,
            {
              status: 'in_progress',
              updatedAtMs: nowMs,
            },
            { merge: true }
          )
          return { skip: false }
        }

        // Different upload that already finished — genuine re-upload.
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
            provider: 'claude_code',
            sourceType: 'ccusage_daily_json',
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
          mappingDiagnostics: {
            source: 'ccusage_daily_json',
            rowsEvaluated: 0,
            matchedRows: 0,
            unmatchedRows: 0,
            matchTypeCounts: {
              canonical_exact: 0,
              source_alias: 0,
              seed_alias_other_source: 0,
              heuristic: 0,
              empty: 0,
            },
            unmatchedModels: [],
          },
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

    const bulkWriter = db.bulkWriter({ throttling: true })

    let saved = 0
    let duplicates = 0
    let minEventAtMs: number | undefined
    let maxEventAtMs: number | undefined
    const models = new Set<string>()
    const mappingObservations = new Map<string, MappingObservation>()
    let rowsEvaluated = 0
    let matchedRows = 0
    let unmatchedRows = 0
    const matchTypeCounts: Record<ModelResolutionMatchType, number> = {
      canonical_exact: 0,
      source_alias: 0,
      seed_alias_other_source: 0,
      heuristic: 0,
      empty: 0,
    }
    const unmatchedModelMap = new Map<string, {
      rawModelName: string
      canonicalSuggestion: string
      source: string
      occurrences: number
    }>()

    bulkWriter.onWriteError((err) => {
      const status: any = (err as any).status || (err as any).code
      const attempts: number = (err as any).failedAttempts ?? 0

      // Continue on already-exists duplicates (no retry needed).
      if (status === 6 || status === 'ALREADY_EXISTS' || status === 'already-exists') {
        duplicates += 1
        return false // don't retry, it's a known duplicate
      }

      // Retry transient errors up to the BulkWriter's internal limit (default 10).
      const TRANSIENT_CODES = new Set([4, 8, 10, 14, 'DEADLINE_EXCEEDED', 'UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'ABORTED'])
      if (TRANSIENT_CODES.has(status) && attempts < 10) {
        console.warn(`BulkWriter transient error (code=${status}, attempt=${attempts}), retrying...`)
        return true // retry
      }

      console.error('BulkWriter permanent error:', err)
      return false
    })

    // Process newest rows first so genuinely new data is written before we
    // spend time on older rows that likely already exist (and would be duplicates).
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]

      const eventAtMs = Number(row.timestamp)
      if (!Number.isFinite(eventAtMs) || eventAtMs <= 0) continue

      const expandedModelName = String(row.expandedModelName || row.model || '').trim()
      const resolution = resolveCanonicalModelNameWithDiagnostics(
        row.model || expandedModelName,
        'ccusage_daily_json'
      )
      const modelName = resolution.canonicalName
      rowsEvaluated += 1
      matchTypeCounts[resolution.matchType] += 1
      if (resolution.isSeedMatch) {
        matchedRows += 1
      } else if (resolution.matchType !== 'empty') {
        unmatchedRows += 1
        const rawModelName = String(row.model || expandedModelName || '').trim()
        const unmatchedKey = `${rawModelName}|${modelName}`
        const prev = unmatchedModelMap.get(unmatchedKey)
        if (prev) {
          prev.occurrences += 1
        } else {
          unmatchedModelMap.set(unmatchedKey, {
            rawModelName,
            canonicalSuggestion: modelName,
            source: 'ccusage_daily_json',
            occurrences: 1,
          })
        }
      }
      if (!modelName) continue

      models.add(modelName)
      const sourceKey = normalizeModelMappingSourceKey('ccusage_daily_json')
      const existingObservation = mappingObservations.get(modelName) ?? {
        canonicalName: modelName,
        sourceKey,
        aliases: new Set<string>(),
      }
      if (expandedModelName) existingObservation.aliases.add(expandedModelName)
      if (row.model) existingObservation.aliases.add(String(row.model))
      mappingObservations.set(modelName, existingObservation)

      const tokens = extractTokens(row)

      const costHasCost = typeof row.costUsd === 'number' && Number.isFinite(row.costUsd)
      const costAmountMicros = costHasCost ? costUsdToMicros(row.costUsd as number) : undefined

      const fingerprint = buildFingerprint({
        provider: 'claude_code',
        sourceType: 'ccusage_daily_json',
        eventAtMs,
        modelName,
        expandedModelName,
        tokens,
        cost: { hasCost: costHasCost, amountMicros: costAmountMicros },
      })

      const eventId = fingerprint
      const docRef = db.collection('users').doc(uid).collection('usageEvents').doc(eventId)

      const doc: Record<string, unknown> = {
        eventId,
        userId: uid,
        provider: 'claude_code',
        sourceType: 'ccusage_daily_json',
        labels: {
          streamType: 'local_upload',
          streamId: 'ccusage_daily_json',
        },
        eventAtMs,
        day: toDayUtc(eventAtMs),
        model: {
          name: modelName,
          ...(expandedModelName ? { expandedName: expandedModelName } : {}),
        },
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      if (organizationId) doc.organizationId = organizationId
      if (teamId) doc.teamId = teamId
      if (row.raw && typeof row.raw === 'object') {
        doc.raw = row.raw
      }
      if (expandedModelName) {
        const existingRaw = (doc.raw && typeof doc.raw === 'object') ? (doc.raw as Record<string, unknown>) : {}
        const mergedExpandedNames = new Set<string>(
          Array.isArray((existingRaw as any).expandedModelNames)
            ? ((existingRaw as any).expandedModelNames as unknown[]).map((v) => String(v || '').trim()).filter(Boolean)
            : []
        )
        mergedExpandedNames.add(expandedModelName)
        doc.raw = {
          ...existingRaw,
          expandedModelNames: Array.from(mergedExpandedNames),
        }
      }

      bulkWriter.create(docRef, doc)
        .then(() => {
          saved += 1
          if (minEventAtMs === undefined || eventAtMs < minEventAtMs) minEventAtMs = eventAtMs
          if (maxEventAtMs === undefined || eventAtMs > maxEventAtMs) maxEventAtMs = eventAtMs
        })
        .catch((e) => {
          console.error('Write failed:', e)
        })

      // Also materialize into org-scoped collection for org-wide analytics.
      if (organizationId) {
        const orgEventId = `${uid}_${eventId}`
        const orgRef = db.collection('organizations').doc(organizationId).collection('usageEvents').doc(orgEventId)
        const orgDoc: Record<string, unknown> = {
          ...doc,
          orgEventId,
        }
        bulkWriter.create(orgRef, orgDoc).catch(() => {
          // handled via onWriteError / duplicate logic
        })
      }
    }

    await bulkWriter.close()
    await persistModelMappingObservations(db, mappingObservations)

    const unmatchedModels = Array.from(unmatchedModelMap.values())
      .sort((a, b) => b.occurrences - a.occurrences || a.rawModelName.localeCompare(b.rawModelName))
      .slice(0, 25)

    if (unmatchedModels.length > 0) {
      const diagnosticsPayload = {
        importId,
        userId: uid,
        source: 'ccusage_daily_json',
        rowsEvaluated,
        matchedRows,
        unmatchedRows,
        matchTypeCounts,
        topUnmatchedModels: unmatchedModels,
      }

      let shouldSendAlert = true
      if (importGuardRef) {
        try {
          const guardAlert = await db.runTransaction(async (tx) => {
            const snap = await tx.get(importGuardRef)
            const alreadySent = Boolean((snap.exists ? (snap.data() as any) : undefined)?.mappingAlertSent)
            if (alreadySent) return false
            tx.set(importGuardRef, { mappingAlertSent: true }, { merge: true })
            return true
          })
          shouldSendAlert = guardAlert
        } catch (e) {
          console.error('Failed to set mappingAlertSent guard:', e)
        }
      }

      if (shouldSendAlert) {
        void sendAdminNotification(
          'Unmatched model aliases detected (ccusage JSON import)',
          'The import used heuristic model mapping for one or more aliases.',
          diagnosticsPayload
        )
      }
    }

    // saved/duplicates accumulated via FieldValue.increment so the guard doc
    // reflects the running total across all chunks of a multi-chunk upload.
    if (importGuardRef) {
      try {
        await importGuardRef.set(
          {
            status: 'complete',
            completedAtMs: Date.now(),
            updatedAtMs: Date.now(),
            saved: admin.firestore.FieldValue.increment(saved),
            duplicates: admin.firestore.FieldValue.increment(duplicates),
            mappingDiagnostics: {
              source: 'ccusage_daily_json',
              rowsEvaluated,
              matchedRows,
              unmatchedRows,
              matchTypeCounts,
              unmatchedModels,
            },
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
      mappingDiagnostics: {
        source: 'ccusage_daily_json',
        rowsEvaluated,
        matchedRows,
        unmatchedRows,
        matchTypeCounts,
        unmatchedModels,
      },
    }
  }
)

