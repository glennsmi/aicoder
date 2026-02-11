import { CursorUsageImportSummary, CursorUsageV2, TokenBreakdown, resolveCanonicalModelName } from '../shared'

export type DetectedFileType = 'cursor_csv' | 'ccusage_json' | 'unknown'

type ParsedUsageFileResult =
  | {
      fileType: Exclude<DetectedFileType, 'unknown'>
      rows: CursorUsageV2[]
      summary: CursorUsageImportSummary
    }
  | {
      fileType: 'unknown'
      rows: []
      summary: CursorUsageImportSummary
      error: string
    }

const normalizeHeader = (h: string): string => h.trim().toLowerCase()

const sanitize = (s: string): string => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')

const parseNumber = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(sanitize(current))
      current = ''
    } else {
      current += char
    }
  }
  result.push(sanitize(current))
  return result
}

const parseCsvText = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headerRow = lines[0]
  const delimiter = headerRow.includes('\t') ? '\t' : ','
  const headers = parseCsvLine(headerRow, delimiter).map(normalizeHeader)
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))
  return { headers, rows }
}

const findHeaderIndex = (headers: string[], candidates: string[]): number => {
  for (const c of candidates.map(normalizeHeader)) {
    const idx = headers.findIndex((h) => h.includes(c))
    if (idx !== -1) return idx
  }
  return -1
}

const findCursorBaseModelHeaderIndex = (headers: string[]): number => {
  const exactPreferred = ['model', 'base model', 'consolidated model']
  for (const candidate of exactPreferred) {
    const idx = headers.findIndex((h) => h === candidate)
    if (idx !== -1) return idx
  }

  const idx = headers.findIndex((h) => h.includes('model') && !h.includes('expanded') && !h.includes('variant') && !h.includes('raw'))
  return idx
}

const findCursorExpandedModelHeaderIndex = (headers: string[]): number => {
  const candidates = [
    'expanded model',
    'expanded model name',
    'full model',
    'model variant',
    'model id',
    'raw model',
  ]
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) => h.includes(candidate))
    if (idx !== -1) return idx
  }
  return -1
}

function parseCursorCsvText(text: string, fileName: string): { rows: CursorUsageV2[]; summary: CursorUsageImportSummary } {
  const { headers, rows } = parseCsvText(text)
  const summary: CursorUsageImportSummary = {
    filesProcessed: 0,
    totalRows: rows.length,
    acceptedRows: 0,
    skippedRows: 0,
    dedupedRows: 0,
    errors: [],
  }

  const dateIdx = findHeaderIndex(headers, ['date'])
  const modelIdx = findCursorBaseModelHeaderIndex(headers)
  const expandedModelIdx = findCursorExpandedModelHeaderIndex(headers)
  const tokensIdx = findHeaderIndex(headers, ['tokens', 'token', 'total tokens'])
  const costIdx = findHeaderIndex(headers, ['cost ($)', 'cost'])
  const inputWithCacheWriteIdx = findHeaderIndex(headers, ['input (w/ cache write)', 'input with cache write'])
  const inputWithoutCacheWriteIdx = findHeaderIndex(headers, ['input (w/o cache write)', 'input without cache write'])
  const cacheReadIdx = findHeaderIndex(headers, ['cache read'])
  const outputTokensIdx = findHeaderIndex(headers, ['output tokens', 'output'])
  const totalTokensIdx = findHeaderIndex(headers, ['total tokens', 'total'])

  const hasNewFormat = inputWithCacheWriteIdx !== -1 && outputTokensIdx !== -1
  if (dateIdx === -1 || modelIdx === -1) {
    summary.errors.push(`${fileName}: Missing required headers (date, model)`)
    return { rows: [], summary }
  }
  if (!hasNewFormat && tokensIdx === -1) {
    summary.errors.push(`${fileName}: Missing token data`)
    return { rows: [], summary }
  }

  summary.filesProcessed = 1
  const parsedRows: CursorUsageV2[] = []
  for (const row of rows) {
    const rawDate = row[dateIdx] ?? ''
    const dateStr = sanitize(rawDate)
    const parsedDate = new Date(dateStr)
    if (!Number.isFinite(parsedDate.getTime())) {
      summary.skippedRows += 1
      continue
    }

    const rawBaseModelName = sanitize(row[modelIdx] ?? '').trim()
    const rawExpandedModelName = expandedModelIdx >= 0 ? sanitize(row[expandedModelIdx] ?? '').trim() : ''
    const expandedModelName = rawExpandedModelName || rawBaseModelName
    const model = resolveCanonicalModelName(rawBaseModelName || expandedModelName, 'cursor_csv')
    if (!model) {
      summary.skippedRows += 1
      continue
    }

    let tokens = 0
    let tokenBreakdown: TokenBreakdown | undefined
    if (hasNewFormat) {
      const inputWithCacheWrite = parseNumber(sanitize(row[inputWithCacheWriteIdx] ?? '0'))
      const inputWithoutCacheWrite = parseNumber(sanitize(row[inputWithoutCacheWriteIdx] ?? '0'))
      const cacheRead = parseNumber(sanitize(row[cacheReadIdx] ?? '0'))
      const output = parseNumber(sanitize(row[outputTokensIdx] ?? '0'))
      const total =
        totalTokensIdx >= 0
          ? parseNumber(sanitize(row[totalTokensIdx] ?? '0'))
          : inputWithCacheWrite + inputWithoutCacheWrite + cacheRead + output
      tokenBreakdown = { inputWithCacheWrite, inputWithoutCacheWrite, cacheRead, output, total }
      tokens = total
    } else {
      tokens = parseNumber(sanitize(row[tokensIdx] ?? '0'))
    }

    const cost =
      costIdx >= 0
        ? (() => {
            const costStr = sanitize(row[costIdx] ?? '')
            const lowered = costStr.toLowerCase()
            if (!lowered || lowered.includes('included') || lowered.includes('not charged') || lowered.includes('errored')) {
              return 0
            }
            return parseNumber(costStr)
          })()
        : undefined

    parsedRows.push({
      id: `${parsedDate.toISOString()}-${model}-${tokens}-${expandedModelName}`,
      date: dateStr,
      timestamp: parsedDate.getTime(),
      model,
      expandedModelName,
      source: 'cursor_csv',
      tokens,
      tokenBreakdown,
      costUsd: Number.isFinite(cost as number) ? (cost as number) : undefined,
    })
    summary.acceptedRows += 1
  }

  return { rows: parsedRows, summary }
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
  const ms = Date.parse(`${date}T00:00:00.000Z`)
  return Number.isFinite(ms) ? ms : null
}

function toTokenBreakdown(input: {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
}): TokenBreakdown {
  const inputWithCacheWrite = toNumber(input.cacheCreationTokens)
  const inputWithoutCacheWrite = toNumber(input.inputTokens)
  const cacheRead = toNumber(input.cacheReadTokens)
  const output = toNumber(input.outputTokens)
  const total = toNumber(input.totalTokens) || inputWithCacheWrite + inputWithoutCacheWrite + cacheRead + output
  return { inputWithCacheWrite, inputWithoutCacheWrite, cacheRead, output, total }
}

function flattenDailyEntries(obj: unknown): Array<{
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost?: number
  costUSD?: number
  breakdown?: Record<string, unknown>
}> {
  if (!isRecord(obj)) return []

  if (Array.isArray(obj.daily)) {
    return obj.daily.filter(isRecord).map((raw) => ({
      date: typeof raw.date === 'string' ? raw.date : '',
      inputTokens: toNumber(raw.inputTokens),
      outputTokens: toNumber(raw.outputTokens),
      cacheCreationTokens: toNumber((raw as Record<string, unknown>).cacheCreationTokens ?? (raw as Record<string, unknown>).cacheWriteTokens),
      cacheReadTokens: toNumber(raw.cacheReadTokens),
      totalTokens: toNumber(raw.totalTokens),
      totalCost: toCostUsd(raw.totalCost),
      costUSD: toCostUsd(raw.costUSD),
      breakdown: isRecord(raw.breakdown) ? (raw.breakdown as Record<string, unknown>) : undefined,
    }))
  }

  if (obj.type === 'daily' && Array.isArray(obj.data)) {
    return obj.data.filter(isRecord).map((raw) => ({
      date: typeof raw.date === 'string' ? raw.date : '',
      inputTokens: toNumber(raw.inputTokens),
      outputTokens: toNumber(raw.outputTokens),
      cacheCreationTokens: toNumber((raw as Record<string, unknown>).cacheCreationTokens ?? (raw as Record<string, unknown>).cacheWriteTokens),
      cacheReadTokens: toNumber(raw.cacheReadTokens),
      totalTokens: toNumber(raw.totalTokens),
      totalCost: toCostUsd(raw.totalCost),
      costUSD: toCostUsd(raw.costUSD),
      breakdown: isRecord(raw.breakdown) ? (raw.breakdown as Record<string, unknown>) : undefined,
    }))
  }

  if (isRecord(obj.projects)) {
    const mergedByDate = new Map<string, {
      date: string
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
      totalTokens: number
      costUSD: number
      breakdown: Record<string, unknown>
    }>()
    const projects = obj.projects as Record<string, unknown>
    for (const projectName of Object.keys(projects)) {
      const entries = projects[projectName]
      if (!Array.isArray(entries)) continue
      for (const raw of entries) {
        if (!isRecord(raw) || typeof raw.date !== 'string') continue
        const date = raw.date
        const prev = mergedByDate.get(date) ?? {
          date,
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0,
          costUSD: 0,
          breakdown: {},
        }
        prev.inputTokens += toNumber(raw.inputTokens)
        prev.outputTokens += toNumber(raw.outputTokens)
        prev.cacheCreationTokens += toNumber((raw as Record<string, unknown>).cacheCreationTokens ?? (raw as Record<string, unknown>).cacheWriteTokens)
        prev.cacheReadTokens += toNumber(raw.cacheReadTokens)
        prev.totalTokens += toNumber(raw.totalTokens)
        prev.costUSD += toCostUsd(raw.costUSD ?? raw.totalCost) ?? 0
        mergedByDate.set(date, prev)
      }
    }
    return Array.from(mergedByDate.values())
  }

  return []
}

function parseCcusageDailyJsonText(text: string): { rows: CursorUsageV2[]; summary: CursorUsageImportSummary } {
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
  } catch {
    summary.errors.push('Invalid JSON file')
    return { rows: [], summary }
  }

  const entries = flattenDailyEntries(parsed)
  if (entries.length === 0) {
    summary.errors.push('Unsupported ccusage JSON. Expected daily report JSON.')
    return { rows: [], summary }
  }

  const rows: CursorUsageV2[] = []
  for (const entry of entries) {
    if (!entry.date) {
      summary.skippedRows += 1
      continue
    }
    const ts = toIsoDayTimestampMs(entry.date)
    if (ts === null) {
      summary.skippedRows += 1
      continue
    }

    if (entry.breakdown && Object.keys(entry.breakdown).length > 0) {
      for (const rawModel of Object.keys(entry.breakdown)) {
        const breakdown = entry.breakdown[rawModel]
        if (!isRecord(breakdown)) continue
        const canonicalModel = resolveCanonicalModelName(rawModel, 'ccusage_daily_json')
        if (!canonicalModel) continue

        const tb = toTokenBreakdown({
          inputTokens: toNumber(breakdown.inputTokens),
          outputTokens: toNumber(breakdown.outputTokens),
          cacheCreationTokens: toNumber((breakdown as Record<string, unknown>).cacheCreationTokens ?? (breakdown as Record<string, unknown>).cacheWriteTokens),
          cacheReadTokens: toNumber(breakdown.cacheReadTokens),
          totalTokens: toNumber(breakdown.totalTokens),
        })
        const expandedModelName = String((breakdown as Record<string, unknown>).modelName ?? rawModel).trim()

        summary.totalRows += 1
        if (!tb.total) {
          summary.skippedRows += 1
          continue
        }

        rows.push({
          id: `ccusage_daily_${entry.date}_${canonicalModel}_${encodeURIComponent(expandedModelName || rawModel)}`,
          date: entry.date,
          timestamp: ts,
          model: canonicalModel,
          expandedModelName,
          source: 'ccusage_daily_json',
          tokens: tb.total,
          tokenBreakdown: tb,
          costUsd: toCostUsd((breakdown as Record<string, unknown>).costUSD ?? (breakdown as Record<string, unknown>).totalCost),
          raw: { source: 'ccusage', report: 'daily' },
        })
        summary.acceptedRows += 1
      }
      continue
    }

    const tb = toTokenBreakdown(entry)
    summary.totalRows += 1
    if (!tb.total) {
      summary.skippedRows += 1
      continue
    }
    rows.push({
      id: `ccusage_daily_${entry.date}_TOTAL`,
      date: entry.date,
      timestamp: ts,
      model: 'TOTAL',
      source: 'ccusage_daily_json',
      tokens: tb.total,
      tokenBreakdown: tb,
      costUsd: toCostUsd(entry.costUSD ?? entry.totalCost),
      raw: { source: 'ccusage', report: 'daily' },
    })
    summary.acceptedRows += 1
  }

  const seen = new Set<string>()
  const deduped: CursorUsageV2[] = []
  for (const row of rows) {
    if (seen.has(row.id)) {
      summary.dedupedRows += 1
      continue
    }
    seen.add(row.id)
    deduped.push(row)
  }

  return { rows: deduped.sort((a, b) => a.timestamp - b.timestamp), summary }
}

function looksLikeCcusageJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return false
    const obj = parsed as Record<string, unknown>
    return Array.isArray(obj.daily) || Array.isArray(obj.data) || typeof obj.projects === 'object'
  } catch {
    return false
  }
}

function looksLikeCursorCsv(text: string): boolean {
  const { headers } = parseCsvText(text)
  if (headers.length === 0) return false
  const hasDate = findHeaderIndex(headers, ['date']) !== -1
  const hasModel = findCursorBaseModelHeaderIndex(headers) !== -1
  const hasTokens =
    findHeaderIndex(headers, ['tokens', 'token', 'total tokens']) !== -1 ||
    (findHeaderIndex(headers, ['input (w/ cache write)', 'input with cache write']) !== -1 &&
      findHeaderIndex(headers, ['output tokens', 'output']) !== -1)
  return hasDate && hasModel && hasTokens
}

export function detectFileType(fileName: string, text: string): DetectedFileType {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.csv')) return 'cursor_csv'
  if (lowerName.endsWith('.json')) return looksLikeCcusageJson(text) ? 'ccusage_json' : 'unknown'
  if (looksLikeCcusageJson(text)) return 'ccusage_json'
  if (looksLikeCursorCsv(text)) return 'cursor_csv'
  return 'unknown'
}

export function parseUsageFile(fileName: string, text: string): ParsedUsageFileResult {
  const fileType = detectFileType(fileName, text)
  if (fileType === 'cursor_csv') {
    const parsed = parseCursorCsvText(text, fileName)
    return { fileType, ...parsed }
  }
  if (fileType === 'ccusage_json') {
    const parsed = parseCcusageDailyJsonText(text)
    return { fileType, ...parsed }
  }
  return {
    fileType: 'unknown',
    rows: [],
    summary: {
      filesProcessed: 1,
      totalRows: 0,
      acceptedRows: 0,
      skippedRows: 0,
      dedupedRows: 0,
      errors: [`Unsupported file format: ${fileName}`],
    },
    error: 'Unsupported file format. Supported formats are Cursor CSV and ccusage daily JSON.',
  }
}
