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
import { normalizeModelMappingSourceKey, resolveCanonicalModelName } from '@shared'

type GetOrgUsageEventsOptions = {
  startMs?: number
  endMs?: number
  limitCount?: number
}

export type OrgUsageRow = CursorUsageV2 & {
  userId?: string
  teamId?: string
  organizationId?: string
  streamId?: string
  streamType?: string
}

function microsToUsd(micros: number): number {
  return micros / 1_000_000
}

function toMillis(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v.getTime() : null
  if (v instanceof Timestamp) return v.toMillis()
  if (v && typeof v === 'object' && typeof (v as any).toMillis === 'function') {
    const ms = Number((v as any).toMillis())
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

function toSourceLabel(data: any): string {
  const streamId = String(data?.labels?.streamId || '').trim()
  const sourceType = String(data?.sourceType || '').trim()
  const provider = String(data?.provider || '').trim()
  const raw = streamId || sourceType || provider || 'unknown'
  return normalizeModelMappingSourceKey(raw)
}

function firstExpandedModelNameFromRaw(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const names = (raw as any).expandedModelNames
  if (!Array.isArray(names)) return undefined
  for (const value of names) {
    const name = String(value || '').trim()
    if (name) return name
  }
  return undefined
}

function mapOrgUsageEventDocToCursorUsageV2(d: QueryDocumentSnapshot<DocumentData>): OrgUsageRow | null {
  const data: any = d.data()
  const source = toSourceLabel(data)

  const eventAtMs = toMillis(data?.eventAtMs) ?? Number(data?.eventAtMs)
  if (!eventAtMs || !Number.isFinite(eventAtMs) || eventAtMs <= 0) return null

  let modelName = String(data?.model?.name ?? data?.model ?? '').trim()
  let expandedModelName =
    typeof data?.model?.expandedName === 'string' ? String(data.model.expandedName).trim() : undefined
  if (!expandedModelName) {
    expandedModelName = firstExpandedModelNameFromRaw(data?.raw)
  }
  if (!modelName) return null
  modelName = resolveCanonicalModelName(modelName, source)

  const tokensTotal = Number(data?.tokens?.total ?? 0) || 0

  // Reconstruct Cursor tokenBreakdown shape when possible.
  let tokenBreakdown: TokenBreakdown | undefined
  const t = data?.tokens || {}
  const other = t?.other || {}

  const cacheWrite = Number(t?.cacheWrite ?? other?.cursorInputWithCacheWrite ?? 0) || 0
  const input = Number(t?.input ?? 0) || 0
  const inputWithoutCacheWrite = Math.max(0, input - cacheWrite)
  const cacheRead = Number(t?.cacheRead ?? 0) || 0
  const output = Number(t?.output ?? 0) || 0

  const hasAnyBreakdown =
    Boolean(t?.hasBreakdown) ||
    cacheWrite > 0 ||
    inputWithoutCacheWrite > 0 ||
    cacheRead > 0 ||
    output > 0

  if (hasAnyBreakdown) {
    tokenBreakdown = {
      inputWithCacheWrite: cacheWrite,
      inputWithoutCacheWrite,
      cacheRead,
      output,
      total: tokensTotal,
    }
  }

  const costHasCost = Boolean(data?.cost?.hasCost)
  const amountMicros = typeof data?.cost?.amountMicros === 'number' ? Number(data.cost.amountMicros) : undefined

  const labels = (data?.labels && typeof data.labels === 'object') ? data.labels : {}
  const streamId = typeof labels?.streamId === 'string' ? labels.streamId : undefined
  const streamType = typeof labels?.streamType === 'string' ? labels.streamType : undefined

  return {
    id: String(data?.orgEventId ?? data?.eventId ?? d.id),
    date: new Date(eventAtMs).toISOString(),
    timestamp: eventAtMs,
    model: modelName,
    expandedModelName,
    source,
    tokens: tokensTotal,
    tokenBreakdown,
    costUsd: costHasCost && typeof amountMicros === 'number' ? microsToUsd(amountMicros) : undefined,
    raw: data?.raw,
    userId: typeof data?.userId === 'string' ? data.userId : undefined,
    teamId: typeof data?.teamId === 'string' ? data.teamId : undefined,
    organizationId: typeof data?.organizationId === 'string' ? data.organizationId : undefined,
    streamId,
    streamType,
  }
}

export async function getOrgUsageEventsV2(
  organizationId: string,
  options: GetOrgUsageEventsOptions = {}
): Promise<OrgUsageRow[]> {
  const ref = collection(db, 'organizations', organizationId, 'usageEvents')

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

  // Queried newest-first; return oldest-first for chart processing.
  const out: OrgUsageRow[] = []
  for (const d of allDocs.reverse()) {
    const mapped = mapOrgUsageEventDocToCursorUsageV2(d)
    if (mapped) out.push(mapped)
  }
  return out
}

