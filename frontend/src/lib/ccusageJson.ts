import type { CursorUsageImportSummary, CursorUsageV2, TokenBreakdown } from '@shared'
import { resolveCanonicalModelName } from '@shared'

type CcusageDailyEntry = {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost?: number
  costUSD?: number
  breakdown?: Record<string, CcusageBreakdownEntry>
}

type CcusageBreakdownEntry = Partial<CcusageDailyEntry> & {
  costUSD?: number
  totalCost?: number
  expandedModelNames?: string[]
}

type CcusageDailyJsonStandard = {
  daily: unknown
  totals?: unknown
  projects?: unknown
}

type CcusageDailyJsonTyped = {
  type?: unknown
  data?: unknown
  summary?: unknown
  projects?: unknown
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

function toCostUsd(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

function toIsoDayTimestampMs(date: string): number | null {
  // ccusage daily date is YYYY-MM-DD. Anchor to UTC to avoid local TZ drift.
  const ms = Date.parse(`${date}T00:00:00.000Z`)
  return Number.isFinite(ms) ? ms : null
}

function toTokenBreakdown(e: Pick<
  CcusageDailyEntry,
  'inputTokens' | 'outputTokens' | 'cacheCreationTokens' | 'cacheReadTokens' | 'totalTokens'
>): TokenBreakdown {
  // Map ccusage buckets into our shared token breakdown.
  // Treat cacheCreationTokens as "input with cache write" (it is still input-side tokens).
  const inputWithCacheWrite = toNumber(e.cacheCreationTokens)
  const inputWithoutCacheWrite = toNumber(e.inputTokens)
  const cacheRead = toNumber(e.cacheReadTokens)
  const output = toNumber(e.outputTokens)
  const total = toNumber(e.totalTokens) || inputWithCacheWrite + inputWithoutCacheWrite + cacheRead + output

  return { inputWithCacheWrite, inputWithoutCacheWrite, cacheRead, output, total }
}

function parseBreakdownRecordLike(input: unknown): Record<string, CcusageBreakdownEntry> | undefined {
  if (!isRecord(input)) return undefined
  return input as Record<string, CcusageBreakdownEntry>
}

function parseModelBreakdownsArray(
  input: unknown
): Record<string, CcusageBreakdownEntry> | undefined {
  if (!Array.isArray(input)) return undefined

  const out: Record<string, CcusageBreakdownEntry> = {}

  for (const item of input) {
    if (!isRecord(item)) continue
    const rawName = [
      (item as any).modelName,
      (item as any).model,
      (item as any).expandedModelName,
      (item as any).expandedModel,
      (item as any).name,
      (item as any).id,
    ]
      .map((v) => (typeof v === 'string' ? String(v).trim() : ''))
      .find(Boolean) || ''
    const expandedModelName = String(rawName || '').trim()
    const modelName = expandedModelName || resolveCanonicalModelName(rawName, 'ccusage_daily_json')
    if (!modelName) continue

    const prev = isRecord(out[modelName]) ? (out[modelName] as any) : {}
    const expandedModelNames = new Set<string>(
      Array.isArray(prev.expandedModelNames)
        ? (prev.expandedModelNames as string[]).map((v) => String(v).trim()).filter(Boolean)
        : []
    )
    if (expandedModelName) expandedModelNames.add(expandedModelName)

    out[modelName] = {
      inputTokens: toNumber(prev.inputTokens) + toNumber((item as any).inputTokens),
      outputTokens: toNumber(prev.outputTokens) + toNumber((item as any).outputTokens),
      cacheCreationTokens:
        toNumber(prev.cacheCreationTokens) +
        toNumber((item as any).cacheCreationTokens ?? (item as any).cacheWriteTokens),
      cacheReadTokens: toNumber(prev.cacheReadTokens) + toNumber((item as any).cacheReadTokens),
      totalTokens: toNumber(prev.totalTokens) + toNumber((item as any).totalTokens),
      costUSD:
        (toCostUsd(prev.costUSD ?? prev.totalCost) ?? 0) +
        (toCostUsd((item as any).costUSD ?? (item as any).totalCost ?? (item as any).cost) ?? 0),
      expandedModelNames: Array.from(expandedModelNames).sort(),
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function pickExpandedModelName(
  canonicalModelName: string,
  breakdownModelKey: string,
  breakdown: Record<string, unknown>
): string {
  const normalizedCanonical = resolveCanonicalModelName(canonicalModelName, 'ccusage_daily_json')
  const candidates = [
    typeof breakdown.modelName === 'string' ? String(breakdown.modelName).trim() : '',
    typeof breakdown.model === 'string' ? String(breakdown.model).trim() : '',
    typeof (breakdown as any).expandedModelName === 'string' ? String((breakdown as any).expandedModelName).trim() : '',
    typeof (breakdown as any).expandedModel === 'string' ? String((breakdown as any).expandedModel).trim() : '',
    typeof (breakdown as any).name === 'string' ? String((breakdown as any).name).trim() : '',
    typeof (breakdown as any).id === 'string' ? String((breakdown as any).id).trim() : '',
    ...(Array.isArray((breakdown as any).expandedModelNames)
      ? ((breakdown as any).expandedModelNames as unknown[])
          .map((v) => String(v).trim())
          .filter(Boolean)
      : []),
    String(breakdownModelKey || '').trim(),
  ].filter(Boolean)

  if (candidates.length === 0) return breakdownModelKey

  // Prefer a concrete expanded label over the normalized canonical form.
  const nonCanonical = candidates.filter((name) => {
    return normalizedCanonical
      ? name.toLowerCase() !== normalizedCanonical.toLowerCase()
      : true
  })

  const ranked = (nonCanonical.length > 0 ? nonCanonical : candidates).sort((a, b) => {
    const aNorm = resolveCanonicalModelName(a, 'ccusage_daily_json')
    const bNorm = resolveCanonicalModelName(b, 'ccusage_daily_json')
    const aMatchesCanonical = normalizedCanonical && aNorm === normalizedCanonical
    const bMatchesCanonical = normalizedCanonical && bNorm === normalizedCanonical

    // Prefer values that map to the same canonical model (usually variant suffixes).
    if (aMatchesCanonical !== bMatchesCanonical) return aMatchesCanonical ? -1 : 1
    // Then prefer the most specific string.
    if (a.length !== b.length) return b.length - a.length
    return a.localeCompare(b)
  })

  return ranked[0] || breakdownModelKey
}

function parseDailyEntry(raw: unknown): CcusageDailyEntry | null {
  if (!isRecord(raw)) return null
  const date = typeof raw.date === 'string' ? raw.date : null
  if (!date) return null

  const inputTokens = toNumber(raw.inputTokens)
  const outputTokens = toNumber(raw.outputTokens)
  const cacheCreationTokens = toNumber((raw as any).cacheCreationTokens ?? (raw as any).cacheWriteTokens)
  const cacheReadTokens = toNumber((raw as any).cacheReadTokens)
  const totalTokens = toNumber(raw.totalTokens)

  const totalCost = toCostUsd((raw as any).totalCost)
  const costUSD = toCostUsd((raw as any).costUSD)

  const breakdown =
    parseBreakdownRecordLike((raw as any).breakdown) ??
    parseBreakdownRecordLike((raw as any).modelBreakdowns) ??
    parseModelBreakdownsArray((raw as any).modelBreakdowns)

  return {
    date,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens,
    totalCost,
    costUSD,
    breakdown,
  }
}

function flattenDailyEntries(obj: unknown): { entries: CcusageDailyEntry[]; errors: string[] } {
  const errors: string[] = []

  // Standard shape: { daily: [...] }
  if (isRecord(obj) && Array.isArray((obj as CcusageDailyJsonStandard).daily)) {
    const entries = ((obj as any).daily as unknown[]).map(parseDailyEntry).filter(Boolean) as CcusageDailyEntry[]
    if (entries.length === 0) errors.push('No valid daily entries found in `.daily` array')
    return { entries, errors }
  }

  // Typed shape: { type: "daily", data: [...] }
  if (isRecord(obj) && (obj as CcusageDailyJsonTyped).type === 'daily' && Array.isArray((obj as any).data)) {
    const entries = ((obj as any).data as unknown[]).map(parseDailyEntry).filter(Boolean) as CcusageDailyEntry[]
    if (entries.length === 0) errors.push('No valid daily entries found in `.data` array')
    return { entries, errors }
  }

  // Project-grouped shape: { projects: { [projectName]: [...] }, totals: ... }
  // We intentionally drop project names for privacy and aggregate across all projects.
  if (isRecord(obj) && isRecord((obj as any).projects)) {
    const projects = (obj as any).projects as Record<string, unknown>
    const mergedByDate = new Map<string, CcusageDailyEntry>()

    for (const projectName of Object.keys(projects)) {
      const v = projects[projectName]
      if (!Array.isArray(v)) continue
      for (const rawEntry of v) {
        const e = parseDailyEntry(rawEntry)
        if (!e) continue

        const prev = mergedByDate.get(e.date)
        if (!prev) {
          mergedByDate.set(e.date, { ...e })
          continue
        }

        prev.inputTokens += e.inputTokens
        prev.outputTokens += e.outputTokens
        prev.cacheCreationTokens += e.cacheCreationTokens
        prev.cacheReadTokens += e.cacheReadTokens
        prev.totalTokens += e.totalTokens

        // Costs are estimates; sum them if present.
        const prevCost = toCostUsd(prev.costUSD ?? prev.totalCost) ?? 0
        const addCost = toCostUsd(e.costUSD ?? e.totalCost) ?? 0
        const summed = prevCost + addCost
        prev.costUSD = summed
        prev.totalCost = summed

        // Merge breakdown per model if present.
        if (prev.breakdown || e.breakdown) {
          const out: Record<string, any> = { ...(prev.breakdown ?? {}) }
          const add = e.breakdown ?? {}
          for (const modelName of Object.keys(add)) {
            const cur = isRecord(out[modelName]) ? (out[modelName] as any) : {}
            const inc = isRecord(add[modelName]) ? (add[modelName] as any) : {}
            const expandedModelNames = new Set<string>([
              ...(Array.isArray(cur.expandedModelNames) ? cur.expandedModelNames : []),
              ...(Array.isArray(inc.expandedModelNames) ? inc.expandedModelNames : []),
            ].map((v) => String(v).trim()).filter(Boolean))
            out[modelName] = {
              inputTokens: toNumber(cur.inputTokens) + toNumber(inc.inputTokens),
              outputTokens: toNumber(cur.outputTokens) + toNumber(inc.outputTokens),
              cacheCreationTokens: toNumber(cur.cacheCreationTokens) + toNumber(inc.cacheCreationTokens),
              cacheReadTokens: toNumber(cur.cacheReadTokens) + toNumber(inc.cacheReadTokens),
              totalTokens: toNumber(cur.totalTokens) + toNumber(inc.totalTokens),
              costUSD: (toCostUsd(cur.costUSD) ?? 0) + (toCostUsd(inc.costUSD) ?? 0),
              expandedModelNames: Array.from(expandedModelNames).sort(),
            }
          }
          prev.breakdown = out
        }
      }
    }

    const entries = Array.from(mergedByDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
    if (entries.length === 0) errors.push('No valid daily entries found in `.projects`')
    return { entries, errors }
  }

  errors.push('Unsupported ccusage JSON. Expected a daily report JSON (`ccusage daily --json`).')
  return { entries: [], errors }
}

export function parseCcusageDailyJsonText(
  text: string,
  options: { includePerModelBreakdown?: boolean } = {}
): { rows: CursorUsageV2[]; summary: CursorUsageImportSummary } {
  const includePerModelBreakdown = options.includePerModelBreakdown ?? true

  const summary: CursorUsageImportSummary = {
    filesProcessed: 1,
    totalRows: 0,
    acceptedRows: 0,
    skippedRows: 0,
    dedupedRows: 0,
    errors: [],
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e: any) {
    summary.errors.push('Invalid JSON file')
    return { rows: [], summary }
  }

  const { entries, errors } = flattenDailyEntries(parsed)
  summary.errors.push(...errors)

  const out: CursorUsageV2[] = []

  for (const e of entries) {
    const ts = toIsoDayTimestampMs(e.date)
    if (ts === null) {
      summary.skippedRows += 1
      continue
    }

    const base = {
      date: e.date,
      timestamp: ts,
    }

    // If per-model breakdown exists, emit a row per model per day.
    if (includePerModelBreakdown && e.breakdown && isRecord(e.breakdown)) {
      for (const modelName of Object.keys(e.breakdown)) {
        const b = e.breakdown[modelName]
        if (!isRecord(b)) continue

        const entry: CcusageDailyEntry = {
          date: e.date,
          inputTokens: toNumber((b as any).inputTokens),
          outputTokens: toNumber((b as any).outputTokens),
          cacheCreationTokens: toNumber((b as any).cacheCreationTokens),
          cacheReadTokens: toNumber((b as any).cacheReadTokens),
          totalTokens: toNumber((b as any).totalTokens),
          costUSD: toCostUsd((b as any).costUSD),
          totalCost: toCostUsd((b as any).totalCost),
        }

        const tb = toTokenBreakdown(entry)
        const costUsd = toCostUsd(entry.costUSD ?? entry.totalCost)
        const tokens = tb.total

        summary.totalRows += 1
        if (!modelName || !tokens) {
          summary.skippedRows += 1
          continue
        }

        const canonicalModelName = resolveCanonicalModelName(modelName, 'ccusage_daily_json')
        if (!canonicalModelName) {
          summary.skippedRows += 1
          continue
        }
        const expandedModelName = pickExpandedModelName(canonicalModelName, modelName, b as Record<string, unknown>)

        // Include expanded model name in ID so variants do not collapse into one row.
        const id = `ccusage_daily_${e.date}_${canonicalModelName}_${encodeURIComponent(expandedModelName || modelName)}`
        out.push({
          id,
          ...base,
          model: canonicalModelName,
          expandedModelName,
          source: 'ccusage_daily_json',
          tokens,
          tokenBreakdown: tb,
          costUsd: typeof costUsd === 'number' ? costUsd : undefined,
          raw: {
            source: 'ccusage',
            report: 'daily',
            expandedModelNames: Array.isArray((b as any).expandedModelNames) ? (b as any).expandedModelNames : [expandedModelName],
            ...(isRecord(parsed) ? { hasProjects: Boolean((parsed as any).projects) } : {}),
          },
        })
        summary.acceptedRows += 1
      }
      continue
    }

    // Fallback: emit a single "total" row per day.
    const tb = toTokenBreakdown(e)
    const costUsd = toCostUsd(e.costUSD ?? e.totalCost)

    summary.totalRows += 1
    if (!tb.total) {
      summary.skippedRows += 1
      continue
    }

    const id = `ccusage_daily_${e.date}_TOTAL`
    out.push({
      id,
      ...base,
      model: 'TOTAL',
      source: 'ccusage_daily_json',
      tokens: tb.total,
      tokenBreakdown: tb,
      costUsd: typeof costUsd === 'number' ? costUsd : undefined,
      raw: { source: 'ccusage', report: 'daily' },
    })
    summary.acceptedRows += 1
  }

  // Deduplicate within this import (id-based).
  const seen = new Set<string>()
  const deduped: CursorUsageV2[] = []
  for (const r of out) {
    if (seen.has(r.id)) {
      summary.dedupedRows += 1
      continue
    }
    seen.add(r.id)
    deduped.push(r)
  }

  return { rows: deduped.sort((a, b) => a.timestamp - b.timestamp), summary }
}

