import { collection, getDocs, limit, orderBy, query, startAfter, where, QueryConstraint, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
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

