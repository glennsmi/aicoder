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
  expandedModelTokenTotals: Record<string, number>
}

/**
 * Aggregate raw usage events into hourly buckets by model.
 *
 * This is intentionally "Crossfilter-inspired": we shrink the working set up-front
 * so downstream chart/table computations operate over far fewer rows.
 */
export function aggregateCursorUsageV2ToHourlyByModel(
  rows: CursorUsageV2[],
  options: { groupBy?: 'model' | 'expandedModel' | 'source' } = {}
): CursorUsageV2[] {
  if (!rows || rows.length === 0) return []
  const groupBy = options.groupBy ?? 'model'

  const buckets = new Map<string, BucketAcc>()

  for (const r of rows) {
    const ts = typeof r.timestamp === 'number' && Number.isFinite(r.timestamp)
      ? r.timestamp
      : Date.parse(r.date)

    if (!Number.isFinite(ts)) continue

    const start = hourStartMs(ts)
    const consolidatedModel = String(r.model || '').trim()
    const rawExpandedModelName = Array.isArray((r.raw as any)?.expandedModelNames)
      ? String(((r.raw as any).expandedModelNames as unknown[]).find((v) => String(v || '').trim()) || '').trim()
      : ''
    const expandedModelName = String(r.expandedModelName || rawExpandedModelName || consolidatedModel).trim()
    const source = String(r.source || '').trim() || 'unknown'
    const groupName =
      groupBy === 'expandedModel'
        ? expandedModelName
        : groupBy === 'source'
          ? source
          : consolidatedModel
    if (!groupName) continue

    const key = `${start}|${groupName}`
    const prev = buckets.get(key)

    const tokens = typeof r.tokens === 'number' && Number.isFinite(r.tokens) ? r.tokens : 0
    const costUsd = typeof r.costUsd === 'number' && Number.isFinite(r.costUsd) ? r.costUsd : 0

    if (!prev) {
      buckets.set(key, {
        timestamp: start,
        model: groupName,
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
        expandedModelTokenTotals: expandedModelName
          ? { [expandedModelName]: tokens }
          : {},
      })
      continue
    }

    prev.tokens += tokens
    prev.costUsd += costUsd
    if (expandedModelName) {
      prev.expandedModelTokenTotals[expandedModelName] =
        (prev.expandedModelTokenTotals[expandedModelName] || 0) + tokens
    }

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
      expandedModelName: groupBy === 'expandedModel' ? b.model : undefined,
      source: groupBy === 'source' ? b.model : undefined,
      tokens: b.tokens,
      tokenBreakdown,
      costUsd: b.costUsd,
      raw: {
        expandedModelTokenTotals: b.expandedModelTokenTotals,
      },
    })
  }

  out.sort((a, b) => a.timestamp - b.timestamp || a.model.localeCompare(b.model))
  return out
}

