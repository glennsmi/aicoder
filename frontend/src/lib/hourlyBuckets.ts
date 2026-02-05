import { CursorUsageV2, TokenBreakdown } from '@shared'

const HOUR_MS = 60 * 60 * 1000

function hourStartMs(ms: number): number {
  return Math.floor(ms / HOUR_MS) * HOUR_MS
}

type BucketAcc = {
  timestamp: number
  model: string
  tokens: number
  costUsd: number
  breakdown: TokenBreakdown | null
  sawBreakdown: boolean
  sawNoBreakdown: boolean
}

/**
 * Aggregate raw usage events into hourly buckets by model.
 *
 * This is intentionally "Crossfilter-inspired": we shrink the working set up-front
 * so downstream chart/table computations operate over far fewer rows.
 */
export function aggregateCursorUsageV2ToHourlyByModel(rows: CursorUsageV2[]): CursorUsageV2[] {
  if (!rows || rows.length === 0) return []

  const buckets = new Map<string, BucketAcc>()

  for (const r of rows) {
    const ts = typeof r.timestamp === 'number' && Number.isFinite(r.timestamp)
      ? r.timestamp
      : Date.parse(r.date)

    if (!Number.isFinite(ts)) continue

    const start = hourStartMs(ts)
    const model = r.model || ''
    if (!model) continue

    const key = `${start}|${model}`
    const prev = buckets.get(key)

    const tokens = typeof r.tokens === 'number' && Number.isFinite(r.tokens) ? r.tokens : 0
    const costUsd = typeof r.costUsd === 'number' && Number.isFinite(r.costUsd) ? r.costUsd : 0

    if (!prev) {
      buckets.set(key, {
        timestamp: start,
        model,
        tokens,
        costUsd,
        breakdown: r.tokenBreakdown
          ? {
              inputWithCacheWrite: r.tokenBreakdown.inputWithCacheWrite || 0,
              inputWithoutCacheWrite: r.tokenBreakdown.inputWithoutCacheWrite || 0,
              cacheRead: r.tokenBreakdown.cacheRead || 0,
              output: r.tokenBreakdown.output || 0,
              total: r.tokenBreakdown.total || tokens,
            }
          : null,
        sawBreakdown: Boolean(r.tokenBreakdown),
        sawNoBreakdown: !r.tokenBreakdown,
      })
      continue
    }

    prev.tokens += tokens
    prev.costUsd += costUsd

    if (r.tokenBreakdown) {
      prev.sawBreakdown = true
      if (prev.breakdown) {
        prev.breakdown.inputWithCacheWrite += r.tokenBreakdown.inputWithCacheWrite || 0
        prev.breakdown.inputWithoutCacheWrite += r.tokenBreakdown.inputWithoutCacheWrite || 0
        prev.breakdown.cacheRead += r.tokenBreakdown.cacheRead || 0
        prev.breakdown.output += r.tokenBreakdown.output || 0
        prev.breakdown.total += r.tokenBreakdown.total || tokens
      } else {
        // Mixed shapes: if some events lack breakdown, we cannot represent accurate I/O split.
        // Defer by marking mixed; we'll emit `tokenBreakdown` as undefined.
        prev.breakdown = {
          inputWithCacheWrite: r.tokenBreakdown.inputWithCacheWrite || 0,
          inputWithoutCacheWrite: r.tokenBreakdown.inputWithoutCacheWrite || 0,
          cacheRead: r.tokenBreakdown.cacheRead || 0,
          output: r.tokenBreakdown.output || 0,
          total: r.tokenBreakdown.total || tokens,
        }
      }
    } else {
      prev.sawNoBreakdown = true
    }
  }

  const out: CursorUsageV2[] = []
  for (const b of buckets.values()) {
    const hasReliableBreakdown = b.sawBreakdown && !b.sawNoBreakdown && b.breakdown !== null
    const tokenBreakdown = hasReliableBreakdown ? b.breakdown! : undefined
    const id = `h_${b.timestamp}_${encodeURIComponent(b.model)}`

    out.push({
      id,
      date: new Date(b.timestamp).toISOString(),
      timestamp: b.timestamp,
      model: b.model,
      tokens: b.tokens,
      tokenBreakdown,
      costUsd: b.costUsd,
    })
  }

  out.sort((a, b) => a.timestamp - b.timestamp || a.model.localeCompare(b.model))
  return out
}

