import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import Busboy from 'busboy'
import crypto from 'node:crypto'
import type { Request, Response } from 'express'
import {
  CursorUsageV2,
  ModelResolutionMatchType,
  MODEL_MAPPING_VERSION,
  normalizeModelMappingSourceKey,
  resolveCanonicalModelNameWithDiagnostics,
  sourceAliasFieldName,
  toDisplayModelName,
  toModelMappingDocId,
} from '../shared'
import { parseUsageFile } from './260211_1152_fileParsing'
import { verifyIngestionApiKey } from './260211_1152_ingestionApiKeys'

type SourceConfig = {
  provider: 'cursor' | 'claude_code'
  sourceType: 'csv' | 'ccusage_daily_json'
  streamId: 'api_cursor_csv' | 'api_ccusage_daily_json'
  modelSource: 'cursor_csv' | 'ccusage_daily_json'
}

type RequestWithRawBody = Request & { rawBody?: Buffer }

type MappingObservation = {
  canonicalName: string
  sourceKey: ReturnType<typeof normalizeModelMappingSourceKey>
  aliases: Set<string>
}

type IngestWriteResult = {
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

function jsonError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ ok: false, code, message })
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
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

function extractTokens(sourceType: SourceConfig['sourceType'], row: CursorUsageV2): {
  total: number
  hasBreakdown: boolean
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  other?: Record<string, number>
} {
  const total = Number(row.tokens) || 0
  const tb = row.tokenBreakdown
  if (!tb) return { total, hasBreakdown: false }

  const inputWithCacheWrite = Number(tb.inputWithCacheWrite) || 0
  const inputWithoutCacheWrite = Number(tb.inputWithoutCacheWrite) || 0
  const cacheRead = Number(tb.cacheRead) || 0
  const output = Number(tb.output) || 0
  const other: Record<string, number> =
    sourceType === 'ccusage_daily_json'
      ? {
          ccusageCacheCreationTokens: inputWithCacheWrite,
          ccusageInputTokens: inputWithoutCacheWrite,
        }
      : {
          cursorInputWithCacheWrite: inputWithCacheWrite,
          cursorInputWithoutCacheWrite: inputWithoutCacheWrite,
        }

  return {
    total: Number(tb.total) || total,
    hasBreakdown: true,
    input: inputWithCacheWrite + inputWithoutCacheWrite,
    output,
    cacheRead,
    cacheWrite: inputWithCacheWrite,
    other,
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
    for (const key of keys) parts.push(`${key}=${String(input.tokens.other[key] ?? 0)}`)
  }
  return sha256Base64Url(parts.join('|'))
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

async function parseMultipartRequest(request: RequestWithRawBody): Promise<{
  fileName: string
  fileText: string
  userId?: string
  sourceLabel?: string
  idempotencyKey?: string
}> {
  const contentType = String(request.headers['content-type'] || '')
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new Error('Request must be multipart/form-data')
  }
  if (!request.rawBody) {
    throw new Error('Missing raw request body')
  }

  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {}
    let fileName = ''
    let fileBuffer: Buffer | null = null
    const chunks: Buffer[] = []

    const busboy = Busboy({ headers: request.headers as Record<string, string> })
    busboy.on('field', (name: string, value: string) => {
      fields[name] = value
    })
    busboy.on(
      'file',
      (_fieldname: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
      fileName = info.filename || 'upload.dat'
      file.on('data', (data: Buffer) => chunks.push(data))
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks)
      })
      }
    )
    busboy.on('error', (error: Error) => reject(error))
    busboy.on('finish', () => {
      if (!fileBuffer) {
        reject(new Error('Missing file field in multipart request'))
        return
      }
      resolve({
        fileName: fileName || 'upload.dat',
        fileText: fileBuffer.toString('utf8'),
        userId: fields.userId,
        sourceLabel: fields.sourceLabel,
        idempotencyKey: fields.idempotencyKey,
      })
    })
    busboy.end(request.rawBody)
  })
}

async function parseJsonRequest(request: RequestWithRawBody): Promise<{
  fileName: string
  fileText: string
  userId?: string
  sourceLabel?: string
  idempotencyKey?: string
}> {
  const body = request.body as Record<string, unknown>
  const fileName = typeof body.fileName === 'string' ? body.fileName : ''
  const fileContentBase64 = typeof body.fileContentBase64 === 'string' ? body.fileContentBase64 : ''
  const fileText = fileContentBase64 ? Buffer.from(fileContentBase64, 'base64').toString('utf8') : ''

  if (!fileName || !fileText) {
    throw new Error('JSON body must include fileName and fileContentBase64')
  }
  return {
    fileName,
    fileText,
    userId: typeof body.userId === 'string' ? body.userId : undefined,
    sourceLabel: typeof body.sourceLabel === 'string' ? body.sourceLabel : undefined,
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
  }
}

async function ingestRowsForUser(params: {
  uid: string
  rows: CursorUsageV2[]
  importId: string
  fileName: string
  fileHash: string
  sourceConfig: SourceConfig
  sourceLabel?: string
}): Promise<IngestWriteResult> {
  const { uid, rows, importId, fileName, fileHash, sourceConfig, sourceLabel } = params
  const db = admin.firestore()
  const importGuardRef = db.collection('users').doc(uid).collection('usageEventImports').doc(fileHash)
  const nowMs = Date.now()

  const guardResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(importGuardRef)
    const existing = snap.exists ? (snap.data() as Record<string, unknown>) : undefined
    const status = String(existing?.status || '')

    if (status === 'complete') return { skip: true }
    const startedAtMs = typeof existing?.startedAtMs === 'number' ? Number(existing.startedAtMs) : undefined
    const inProgressFresh = status === 'in_progress' && !!startedAtMs && nowMs - startedAtMs < 30 * 60 * 1000
    if (inProgressFresh) return { skip: true }

    tx.set(
      importGuardRef,
      {
        fileHash,
        fileName,
        importId,
        status: 'in_progress',
        startedAtMs: nowMs,
        updatedAtMs: nowMs,
        rowCount: rows.length,
        provider: sourceConfig.provider,
        sourceType: sourceConfig.sourceType,
        streamType: 'api_key_upload',
        streamId: sourceConfig.streamId,
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
        source: sourceConfig.modelSource,
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

  const userSnap = await db.collection('users').doc(uid).get()
  const userDoc = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : undefined
  const organizationId =
    userDoc && typeof userDoc.organizationId === 'string' ? String(userDoc.organizationId) : undefined

  let teamId: string | undefined
  if (organizationId) {
    const memberSnap = await db.collection('organizations').doc(organizationId).collection('members').doc(uid).get()
    const memberDoc = memberSnap.exists ? (memberSnap.data() as Record<string, unknown>) : undefined
    if (memberDoc && typeof memberDoc.teamId === 'string') {
      teamId = String(memberDoc.teamId)
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
    const status = (err as { status?: unknown; code?: unknown }).status ?? (err as { status?: unknown; code?: unknown }).code
    const attempts = (err as { failedAttempts?: number }).failedAttempts ?? 0
    if (status === 6 || status === 'ALREADY_EXISTS' || status === 'already-exists') {
      duplicates += 1
      return false
    }
    const transient = new Set([4, 8, 10, 14, 'DEADLINE_EXCEEDED', 'UNAVAILABLE', 'RESOURCE_EXHAUSTED', 'ABORTED'])
    return transient.has(status as string | number) && attempts < 10
  })

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i]
    const eventAtMs = Number(row.timestamp)
    if (!Number.isFinite(eventAtMs) || eventAtMs <= 0) continue

    const expandedModelName = String(row.expandedModelName || row.model || '').trim()
    const resolution = resolveCanonicalModelNameWithDiagnostics(
      row.model || expandedModelName,
      sourceConfig.modelSource
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
          source: sourceConfig.modelSource,
          occurrences: 1,
        })
      }
    }
    if (!modelName) continue

    models.add(modelName)
    const sourceKey = normalizeModelMappingSourceKey(sourceConfig.modelSource)
    const existingObservation = mappingObservations.get(modelName) ?? {
      canonicalName: modelName,
      sourceKey,
      aliases: new Set<string>(),
    }
    if (expandedModelName) existingObservation.aliases.add(expandedModelName)
    if (row.model) existingObservation.aliases.add(String(row.model))
    mappingObservations.set(modelName, existingObservation)

    const tokens = extractTokens(sourceConfig.sourceType, row)
    const costHasCost = typeof row.costUsd === 'number' && Number.isFinite(row.costUsd)
    const costAmountMicros = costHasCost ? costUsdToMicros(Number(row.costUsd)) : undefined
    const fingerprint = buildFingerprint({
      provider: sourceConfig.provider,
      sourceType: sourceConfig.sourceType,
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
      provider: sourceConfig.provider,
      sourceType: sourceConfig.sourceType,
      labels: {
        streamType: 'api_key_upload',
        streamId: sourceConfig.streamId,
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
        fileName,
        fileHash,
        rowIndex: i,
        fingerprint,
        ...(sourceLabel ? { sourceLabel } : {}),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (organizationId) doc.organizationId = organizationId
    if (teamId) doc.teamId = teamId
    if (row.raw && typeof row.raw === 'object') doc.raw = row.raw

    bulkWriter.create(docRef, doc).then(() => {
      saved += 1
      if (minEventAtMs === undefined || eventAtMs < minEventAtMs) minEventAtMs = eventAtMs
      if (maxEventAtMs === undefined || eventAtMs > maxEventAtMs) maxEventAtMs = eventAtMs
    }).catch(() => {
      // handled by onWriteError
    })

    if (organizationId) {
      const orgEventId = `${uid}_${eventId}`
      const orgRef = db.collection('organizations').doc(organizationId).collection('usageEvents').doc(orgEventId)
      const orgDoc: Record<string, unknown> = { ...doc, orgEventId }
      bulkWriter.create(orgRef, orgDoc).catch(() => {
        // handled by onWriteError
      })
    }
  }

  await bulkWriter.close()
  await persistModelMappingObservations(db, mappingObservations)

  const unmatchedModels = Array.from(unmatchedModelMap.values())
    .sort((a, b) => b.occurrences - a.occurrences || a.rawModelName.localeCompare(b.rawModelName))
    .slice(0, 25)

  await importGuardRef.set(
    {
      status: 'complete',
      completedAtMs: Date.now(),
      updatedAtMs: Date.now(),
      saved,
      duplicates,
      mappingDiagnostics: {
        source: sourceConfig.modelSource,
        rowsEvaluated,
        matchedRows,
        unmatchedRows,
        matchTypeCounts,
        unmatchedModels,
      },
    },
    { merge: true }
  )

  return {
    importId,
    saved,
    duplicates,
    minEventAtMs,
    maxEventAtMs,
    models: Array.from(models).sort(),
    mappingDiagnostics: {
      source: sourceConfig.modelSource,
      rowsEvaluated,
      matchedRows,
      unmatchedRows,
      matchTypeCounts,
      unmatchedModels,
    },
  }
}

function sourceConfigForFileType(fileType: 'cursor_csv' | 'ccusage_json'): SourceConfig {
  if (fileType === 'cursor_csv') {
    return {
      provider: 'cursor',
      sourceType: 'csv',
      streamId: 'api_cursor_csv',
      modelSource: 'cursor_csv',
    }
  }
  return {
    provider: 'claude_code',
    sourceType: 'ccusage_daily_json',
    streamId: 'api_ccusage_daily_json',
    modelSource: 'ccusage_daily_json',
  }
}

export const ingestUsageFileViaApi = onRequest(
  { region: 'europe-west2', cors: true, timeoutSeconds: 300 },
  async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.status(204).send('')
      return
    }
    if (request.method !== 'POST') {
      jsonError(response, 405, 'method_not_allowed', 'Use POST for this endpoint')
      return
    }

    const authHeader = String(request.headers.authorization || '')
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      jsonError(response, 401, 'invalid_api_key', 'Missing Bearer API key')
      return
    }
    const rawKey = authHeader.slice(7).trim()
    if (!rawKey) {
      jsonError(response, 401, 'invalid_api_key', 'Missing Bearer API key')
      return
    }

    try {
      const db = admin.firestore()
      const keyInfo = await verifyIngestionApiKey(db, rawKey)
      const contentType = String(request.headers['content-type'] || '').toLowerCase()
      const reqWithRawBody = request as RequestWithRawBody
      const parsedRequest = contentType.includes('multipart/form-data')
        ? await parseMultipartRequest(reqWithRawBody)
        : await parseJsonRequest(reqWithRawBody)

      const requestUserId = String(parsedRequest.userId || '').trim()
      if (!requestUserId) {
        jsonError(response, 400, 'missing_user_id', 'userId is required and must match the API key mapping')
        return
      }
      if (requestUserId !== keyInfo.mappedUserId) {
        jsonError(response, 403, 'user_mismatch', 'Provided userId does not match key mapping')
        return
      }

      const parsed = parseUsageFile(parsedRequest.fileName, parsedRequest.fileText)
      if (parsed.fileType === 'unknown') {
        jsonError(response, 400, 'file_type_not_supported', parsed.error)
        return
      }
      if (parsed.rows.length === 0) {
        jsonError(
          response,
          400,
          'invalid_file_schema',
          parsed.summary.errors[0] || 'No valid usage rows detected in uploaded file'
        )
        return
      }
      if (parsed.rows.length > 50000) {
        jsonError(response, 413, 'payload_too_large', 'Too many rows in one upload; split file and retry')
        return
      }

      const fileHash = sha256Hex(parsedRequest.fileText)
      const importId =
        parsedRequest.idempotencyKey && parsedRequest.idempotencyKey.trim()
          ? parsedRequest.idempotencyKey.trim()
          : `api_ingest_${Date.now()}_${fileHash.slice(0, 10)}`
      const sourceConfig = sourceConfigForFileType(parsed.fileType)
      const ingestResult = await ingestRowsForUser({
        uid: requestUserId,
        rows: parsed.rows,
        importId,
        fileName: parsedRequest.fileName,
        fileHash,
        sourceConfig,
        sourceLabel: parsedRequest.sourceLabel,
      })

      response.status(200).json({
        ok: true,
        importId: ingestResult.importId,
        fileType: parsed.fileType,
        rowsReceived: parsed.rows.length,
        rowsImported: ingestResult.saved,
        rowsSkippedDuplicate: ingestResult.duplicates,
        mappedUserId: keyInfo.mappedUserId,
        mappedOrganizationId: keyInfo.mappedOrganizationId ?? null,
        keyId: keyInfo.keyId,
      })
    } catch (error) {
      console.error('ingestUsageFileViaApi error', error)
      const message = error instanceof Error ? error.message : String(error)
      if (message.toLowerCase().includes('invalid api key')) {
        jsonError(response, 401, 'invalid_api_key', 'Invalid API key')
        return
      }
      jsonError(response, 500, 'internal_error', message || 'Failed to ingest file')
    }
  }
)
