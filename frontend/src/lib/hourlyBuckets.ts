import { usageSourceLabel, usageSourceTools } from './usageSource'
import { CursorUsageV2, TokenBreakdown } from '@shared'

const HOUR_MS = 60 * 60 * 1000

export type GroupByMode = 'model' | 'expandedModel' | 'source' | 'provider'

export type ModelProviderLabel =
  | 'Anthropic'
  | 'OpenAI'
  | 'Cursor'
  | 'Google'
  | 'GitHub'
  | 'Other'

/**
 * Map a model name to its vendor. Render-time only — not persisted.
 * Cursor-hosted Grok / Composer names count as Cursor.
 */
export function resolveModelProvider(modelName: string): ModelProviderLabel {
  const n = String(modelName || '').trim().toLowerCase()
  if (!n) return 'Other'

  if (
    n.startsWith('cursor') ||
    n.startsWith('composer') ||
    n.includes('grok') ||
    n.includes('xai')
  ) {
    return 'Cursor'
  }
  if (n.includes('claude') || n.includes('anthropic')) return 'Anthropic'
  if (
    n.startsWith('gpt') ||
    n.startsWith('chatgpt') ||
    n.startsWith('o1') ||
    n.startsWith('o3') ||
    n.startsWith('o4') ||
    n.includes('openai')
  ) {
    return 'OpenAI'
  }
  if (n.includes('gemini') || n.includes('google') || n.includes('vertex')) return 'Google'
  if (n.includes('copilot')) return 'GitHub'
  return 'Other'
}

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
  sourceTools: Set<string>
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
  options: { groupBy?: GroupByMode } = {}
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
    const source = usageSourceLabel(r.source || r.raw?.source)
    const groupName =
      groupBy === 'expandedModel'
        ? expandedModelName
        : groupBy === 'source'
          ? source
          : groupBy === 'provider'
            ? resolveModelProvider(consolidatedModel || expandedModelName)
            : consolidatedModel
    if (!groupName) continue
    // Provider rows should break down into the models users already see, not expanded aliases.
    const breakdownName = groupBy === 'provider' ? consolidatedModel : expandedModelName

    const key = `${start}|${groupName}`
    const prev = buckets.get(key)

    const tokens = typeof r.tokens === 'number' && Number.isFinite(r.tokens) ? r.tokens : 0
    const costUsd = typeof r.costUsd === 'number' && Number.isFinite(r.costUsd) ? r.costUsd : 0

    if (!prev) {
      buckets.set(key, {
        sourceTools: new Set(usageSourceTools(r)),
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
        expandedModelTokenTotals: breakdownName
          ? { [breakdownName]: tokens }
          : {},
      })
      continue
    }

    usageSourceTools(r).forEach(tool => prev.sourceTools.add(tool))
    prev.tokens += tokens
    prev.costUsd += costUsd
    if (breakdownName) {
      prev.expandedModelTokenTotals[breakdownName] =
        (prev.expandedModelTokenTotals[breakdownName] || 0) + tokens
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
        sourceTools: [...b.sourceTools].sort(),
      },
    })
  }

  out.sort((a, b) => a.timestamp - b.timestamp || a.model.localeCompare(b.model))
  return out
}

