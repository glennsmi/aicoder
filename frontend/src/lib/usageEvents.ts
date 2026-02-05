import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebaseApp'
import { CursorUsageV2, TokenBreakdown } from '@shared'

type GetUsageEventsOptions = {
  startMs?: number
  endMs?: number
  /**
   * Max number of events to return.
   * Reads are paged in batches to avoid Firestore structured-query limits.
   */
  limitCount?: number
}

function microsToUsd(micros: number): number {
  return micros / 1_000_000
}

function toMillis(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null
  // Firestore Timestamp
  if (v instanceof Timestamp) return v.toMillis()
  // Timestamp-like object (defensive)
  if (v && typeof v === 'object' && typeof (v as any).toMillis === 'function') {
    const ms = Number((v as any).toMillis())
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

function safeNumber(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

export async function getUserCursorUsageEventsV2(
  userId: string,
  options: GetUsageEventsOptions = {}
): Promise<CursorUsageV2[]> {
  const ref = collection(db, 'users', userId, 'usageEvents')

  // Important: load most-recent events first, otherwise a large account may only
  // load old historical events and make "Last 30 days" look empty.
  const maxTotal = options.limitCount ?? 10000
  const pageSize = Math.min(1000, maxTotal)

  const baseConstraints: QueryConstraint[] = []
  if (typeof options.startMs === 'number') baseConstraints.push(where('eventAtMs', '>=', options.startMs))
  if (typeof options.endMs === 'number') baseConstraints.push(where('eventAtMs', '<', options.endMs))
  baseConstraints.push(orderBy('eventAtMs', 'desc'))

  const allDocs: QueryDocumentSnapshot<DocumentData>[] = []
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null

  while (allDocs.length < maxTotal) {
    const remaining = maxTotal - allDocs.length
    const constraints: QueryConstraint[] = [...baseConstraints]
    if (cursor) constraints.push(startAfter(cursor))
    constraints.push(limit(Math.min(pageSize, remaining)))

    const snap = await getDocs(query(ref, ...constraints))
    if (snap.empty) break

    allDocs.push(...snap.docs)
    cursor = snap.docs[snap.docs.length - 1] ?? null

    if (snap.docs.length < pageSize) break
  }

  // We queried newest-first; return oldest-first for chart processing.
  return allDocs.reverse().map((d) => {
    const data: any = d.data()
    const eventAtMs = Number(data.eventAtMs)
    const modelName = String(data?.model?.name || '')
    const tokensTotal = Number(data?.tokens?.total || 0)

    // Reconstruct Cursor tokenBreakdown if available (so the chart can show input/output/cache details).
    let tokenBreakdown: TokenBreakdown | undefined
    const other = data?.tokens?.other || {}
    const inputWithCacheWrite = Number(other?.cursorInputWithCacheWrite || 0)
    const inputWithoutCacheWrite =
      Number(other?.cursorInputWithoutCacheWrite || 0) ||
      Math.max(0, Number(data?.tokens?.input || 0) - inputWithCacheWrite)
    const cacheRead = Number(data?.tokens?.cacheRead || 0)
    const output = Number(data?.tokens?.output || 0)

    const hasAnyBreakdown =
      Boolean(data?.tokens?.hasBreakdown) ||
      inputWithCacheWrite > 0 ||
      inputWithoutCacheWrite > 0 ||
      cacheRead > 0 ||
      output > 0

    if (hasAnyBreakdown) {
      tokenBreakdown = {
        inputWithCacheWrite,
        inputWithoutCacheWrite,
        cacheRead,
        output,
        total: tokensTotal,
      }
    }

    const hasCost = Boolean(data?.cost?.hasCost)
    const amountMicros = typeof data?.cost?.amountMicros === 'number' ? Number(data.cost.amountMicros) : undefined

    return {
      id: String(data.eventId || d.id),
      date: new Date(eventAtMs).toISOString(),
      timestamp: eventAtMs,
      model: modelName,
      tokens: tokensTotal,
      tokenBreakdown,
      costUsd: hasCost && typeof amountMicros === 'number' ? microsToUsd(amountMicros) : undefined,
      raw: data?.raw,
    }
  })
}

function mapAnyDocToCursorUsageV2(d: QueryDocumentSnapshot<DocumentData>): CursorUsageV2 | null {
  const data: any = d.data()

  const eventAtMs =
    toMillis(data?.eventAtMs) ??
    toMillis(data?.timestamp) ??
    (typeof data?.date === 'string' ? toMillis(new Date(data.date)) : null)

  if (!eventAtMs || !Number.isFinite(eventAtMs) || eventAtMs <= 0) return null

  const model =
    String(data?.model?.name ?? data?.model ?? data?.modelName ?? '').trim()

  if (!model) return null

  // Tokens: support multiple shapes
  const tokensTotal =
    safeNumber(data?.tokens?.total) ??
    safeNumber(data?.tokens) ??
    safeNumber(data?.totalTokens) ??
    (data?.tokenUsage
      ? (safeNumber(data?.tokenUsage?.input) ?? 0) +
        (safeNumber(data?.tokenUsage?.output) ?? 0) +
        (safeNumber(data?.tokenUsage?.cacheWrite) ?? 0) +
        (safeNumber(data?.tokenUsage?.cacheRead) ?? 0)
      : undefined) ??
    0

  // Token breakdown if present in any recognizable form
  let tokenBreakdown: TokenBreakdown | undefined
  if (data?.tokenBreakdown && typeof data.tokenBreakdown === 'object') {
    const tb = data.tokenBreakdown
    tokenBreakdown = {
      inputWithCacheWrite: Number(tb.inputWithCacheWrite || 0),
      inputWithoutCacheWrite: Number(tb.inputWithoutCacheWrite || 0),
      cacheRead: Number(tb.cacheRead || 0),
      output: Number(tb.output || 0),
      total: Number(tb.total || tokensTotal || 0),
    }
  } else if (data?.tokens && typeof data.tokens === 'object') {
    const t = data.tokens
    const other = t.other || {}
    const inputWithCacheWrite = Number(other?.cursorInputWithCacheWrite || 0)
    const inputWithoutCacheWrite =
      Number(other?.cursorInputWithoutCacheWrite || 0) ||
      Math.max(0, Number(t.input || 0) - inputWithCacheWrite)
    const cacheRead = Number(t.cacheRead || 0)
    const output = Number(t.output || 0)
    const hasAny = Boolean(t.hasBreakdown) || inputWithCacheWrite > 0 || inputWithoutCacheWrite > 0 || cacheRead > 0 || output > 0
    if (hasAny) {
      tokenBreakdown = {
        inputWithCacheWrite,
        inputWithoutCacheWrite,
        cacheRead,
        output,
        total: tokensTotal,
      }
    }
  } else if (data?.tokenUsage && typeof data.tokenUsage === 'object') {
    const tu = data.tokenUsage
    const input = Number(tu.input || 0)
    const output = Number(tu.output || 0)
    const cacheWrite = Number(tu.cacheWrite || 0)
    const cacheRead = Number(tu.cacheRead || 0)
    const total = input + output + cacheWrite + cacheRead
    tokenBreakdown = {
      inputWithCacheWrite: cacheWrite,
      inputWithoutCacheWrite: input,
      cacheRead,
      output,
      total,
    }
  }

  // Cost
  const amountMicros = safeNumber(data?.cost?.amountMicros)
  const costUsd =
    (typeof amountMicros === 'number' ? microsToUsd(amountMicros) : undefined) ??
    safeNumber(data?.costUsd) ??
    safeNumber(data?.totalCost) ??
    safeNumber(data?.cost)

  return {
    id: String(data?.eventId ?? data?.id ?? d.id),
    date: typeof data?.date === 'string' ? data.date : new Date(eventAtMs).toISOString(),
    timestamp: eventAtMs,
    model,
    tokens: Number(tokensTotal) || 0,
    tokenBreakdown,
    costUsd: typeof costUsd === 'number' && Number.isFinite(costUsd) ? costUsd : undefined,
    raw: data?.raw,
  }
}

async function getUserCursorUsageV2FromCollection(
  subcollection: string,
  userId: string,
  options: GetUsageEventsOptions = {}
): Promise<CursorUsageV2[]> {
  const ref = collection(db, 'users', userId, subcollection)

  // Try a couple of query shapes; fall back to an unordered sample if needed.
  const tryQueries: Array<() => Promise<QueryDocumentSnapshot<DocumentData>[]>> = [
    async () => {
      const constraints: QueryConstraint[] = []
      if (typeof options.startMs === 'number') constraints.push(where('timestamp', '>=', options.startMs))
      if (typeof options.endMs === 'number') constraints.push(where('timestamp', '<', options.endMs))
      constraints.push(orderBy('timestamp', 'desc'))
      constraints.push(limit(options.limitCount ?? 10000))
      const snap = await getDocs(query(ref, ...constraints))
      return snap.docs
    },
    async () => {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(options.limitCount ?? 10000)]
      const snap = await getDocs(query(ref, ...constraints))
      return snap.docs
    },
    async () => {
      const snap = await getDocs(query(ref, limit(Math.min(5000, options.limitCount ?? 10000))))
      return snap.docs
    },
  ]

  let docs: QueryDocumentSnapshot<DocumentData>[] = []
  for (const fn of tryQueries) {
    try {
      docs = await fn()
      break
    } catch (e) {
      // continue trying fallbacks
    }
  }

  const out: CursorUsageV2[] = []
  for (const d of docs) {
    const mapped = mapAnyDocToCursorUsageV2(d)
    if (mapped) out.push(mapped)
  }

  // Sort ascending for chart processing
  out.sort((a, b) => a.timestamp - b.timestamp)
  return out
}

export type UserUsageLoadSource = 'usageEvents' | 'cursorUsage' | 'enhancedAggregatedUsage' | 'aggregatedUsage' | 'none'

export async function getUserAnySavedUsageV2(
  userId: string,
  options: GetUsageEventsOptions = {}
): Promise<{ source: UserUsageLoadSource; rows: CursorUsageV2[] }> {
  // 1) Preferred canonical source
  try {
    const rows = await getUserCursorUsageEventsV2(userId, options)
    if (rows.length > 0) return { source: 'usageEvents', rows }
  } catch {
    // If rules/indexing cause errors, continue to fallbacks
  }

  // 2) Legacy sources (best-effort mapping)
  const cursorUsage = await getUserCursorUsageV2FromCollection('cursorUsage', userId, options)
  if (cursorUsage.length > 0) return { source: 'cursorUsage', rows: cursorUsage }

  const enhancedAgg = await getUserCursorUsageV2FromCollection('enhancedAggregatedUsage', userId, options)
  if (enhancedAgg.length > 0) return { source: 'enhancedAggregatedUsage', rows: enhancedAgg }

  const agg = await getUserCursorUsageV2FromCollection('aggregatedUsage', userId, options)
  if (agg.length > 0) return { source: 'aggregatedUsage', rows: agg }

  return { source: 'none', rows: [] }
}

export type UsageDiagnostics = {
  projectId?: string
  checks: Array<{
    collection: string
    ok: boolean
    error?: string
    sampleCount?: number
    latestMs?: number
  }>
}

async function probeSubcollection(userId: string, subcollection: string): Promise<{ ok: boolean; error?: string; sampleCount?: number; latestMs?: number }> {
  try {
    const ref = collection(db, 'users', userId, subcollection)
    // Try to get newest-ish doc. If ordering fails (missing field/index), fall back to limit-only.
    try {
      const snap = await getDocs(query(ref, orderBy('eventAtMs', 'desc'), limit(5)))
      const docs = snap.docs
      const latest = docs[0]?.data() as any
      const latestMs = toMillis(latest?.eventAtMs) ?? toMillis(latest?.timestamp) ?? null
      return { ok: true, sampleCount: docs.length, latestMs: latestMs ?? undefined }
    } catch {
      const snap = await getDocs(query(ref, limit(5)))
      const docs = snap.docs
      // Best-effort latest from these docs
      let latestMs: number | undefined
      for (const d of docs) {
        const data: any = d.data()
        const ms = toMillis(data?.eventAtMs) ?? toMillis(data?.timestamp) ?? (typeof data?.date === 'string' ? toMillis(new Date(data.date)) ?? undefined : undefined)
        if (typeof ms === 'number' && Number.isFinite(ms)) {
          latestMs = latestMs === undefined ? ms : Math.max(latestMs, ms)
        }
      }
      return { ok: true, sampleCount: docs.length, latestMs }
    }
  } catch (e: any) {
    const msg = String(e?.message || e?.code || e)
    return { ok: false, error: msg }
  }
}

export async function getUserUsageDiagnostics(userId: string): Promise<UsageDiagnostics> {
  // Note: projectId is available on underlying app config, but db doesn't expose it cleanly.
  const checks = await Promise.all([
    probeSubcollection(userId, 'usageEvents').then((r) => ({ collection: 'users/{uid}/usageEvents', ...r })),
    probeSubcollection(userId, 'usageEventImports').then((r) => ({ collection: 'users/{uid}/usageEventImports', ...r })),
    probeSubcollection(userId, 'cursorUsage').then((r) => ({ collection: 'users/{uid}/cursorUsage', ...r })),
    probeSubcollection(userId, 'aggregatedUsage').then((r) => ({ collection: 'users/{uid}/aggregatedUsage', ...r })),
    probeSubcollection(userId, 'enhancedAggregatedUsage').then((r) => ({ collection: 'users/{uid}/enhancedAggregatedUsage', ...r })),
    probeSubcollection(userId, 'rawUsage').then((r) => ({ collection: 'users/{uid}/rawUsage', ...r })),
    probeSubcollection(userId, 'enhancedRawUsage').then((r) => ({ collection: 'users/{uid}/enhancedRawUsage', ...r })),
  ])

  return { checks }
}

