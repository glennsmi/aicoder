import { useCallback, useEffect, useState } from 'react'
import { CursorUsageV2, CursorUsageImportSummary, TokenBreakdown } from '@shared'
import { resolveCanonicalModelName } from '@shared'
import { parseCcusageDailyJsonText } from '@/lib/ccusageJson'

interface CSVDragDropProps {
  onCsvImport?: (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => void
  onCcusageImport?: (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => void
  disabled?: boolean
}

type ParsedCursorCsvResult = {
  rows: CursorUsageV2[]
  summary: CursorUsageImportSummary
}

type DetectedFileType = 'cursor_csv' | 'ccusage_json' | 'unknown'
type HelpTab = 'cursor_csv' | 'ccusage_json'
const usageHelpDialogStorageKey = 'aicoder:open-upload-help-tab'
const usageHelpDialogEventName = 'aicoder:open-upload-help'

const normalizeHeader = (h: string) => h.trim().toLowerCase()

const parseNumber = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

const sanitize = (s: string): string => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')

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

const parseCsvText = (text: string) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }
  const headerRow = lines[0]
  const delimiter = headerRow.indexOf('\t') !== -1 ? '\t' : ','
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

  const containsPreferred = ['model']
  for (const candidate of containsPreferred) {
    const idx = headers.findIndex((h) => {
      if (!h.includes(candidate)) return false
      // Avoid picking expanded/variant model columns as the base model column.
      if (h.includes('expanded') || h.includes('variant') || h.includes('full') || h.includes('raw')) return false
      return true
    })
    if (idx !== -1) return idx
  }
  return -1
}

const findCursorExpandedModelHeaderIndex = (headers: string[]): number => {
  const exactPreferred = [
    'expanded model',
    'expanded model name',
    'full model',
    'model variant',
    'model id',
    'raw model',
  ]
  for (const candidate of exactPreferred) {
    const idx = headers.findIndex((h) => h === candidate)
    if (idx !== -1) return idx
  }

  const containsPreferred = [
    'expanded model',
    'expanded',
    'model variant',
    'model id',
    'full model',
    'raw model',
  ]
  for (const candidate of containsPreferred) {
    const idx = headers.findIndex((h) => h.includes(candidate))
    if (idx !== -1) return idx
  }
  return -1
}

const buildUsageFingerprint = (u: CursorUsageV2): string => {
  const tb = u.tokenBreakdown
  return [
    String(u.timestamp),
    String(u.model || ''),
    String(u.expandedModelName || ''),
    String(u.source || ''),
    String(u.tokens || 0),
    String(u.costUsd ?? ''),
    String(tb?.inputWithCacheWrite ?? ''),
    String(tb?.inputWithoutCacheWrite ?? ''),
    String(tb?.cacheRead ?? ''),
    String(tb?.output ?? ''),
    String(tb?.total ?? ''),
  ].join('|')
}

const dedupeRows = (rows: CursorUsageV2[]): { rows: CursorUsageV2[]; dedupedRows: number } => {
  const seen = new Set<string>()
  const out: CursorUsageV2[] = []
  let dedupedRows = 0
  for (const row of rows) {
    const key = buildUsageFingerprint(row)
    if (seen.has(key)) {
      dedupedRows += 1
      continue
    }
    seen.add(key)
    out.push(row)
  }
  return { rows: out, dedupedRows }
}

const toUsage = (
  row: string[],
  idxMap: {
    date: number
    model: number
    expandedModel?: number
    tokens: number
    cost: number
    inputWithCacheWrite?: number
    inputWithoutCacheWrite?: number
    cacheRead?: number
    outputTokens?: number
    totalTokens?: number
  }
) => {
  const rawDate = row[idxMap.date] ?? ''
  const dateStr = sanitize(rawDate)
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return null
  const rawBaseModelName = sanitize(row[idxMap.model] ?? '').trim()
  const rawExpandedModelName =
    idxMap.expandedModel !== undefined && idxMap.expandedModel >= 0
      ? sanitize(row[idxMap.expandedModel] ?? '').trim()
      : ''
  const expandedModelName = rawExpandedModelName || rawBaseModelName
  const model = resolveCanonicalModelName(rawBaseModelName || expandedModelName, 'cursor_csv')

  let tokens = 0
  let tokenBreakdown: TokenBreakdown | undefined

  const hasNewFormat =
    idxMap.inputWithCacheWrite !== undefined &&
    idxMap.inputWithCacheWrite >= 0 &&
    idxMap.outputTokens !== undefined &&
    idxMap.outputTokens >= 0

  if (hasNewFormat) {
    const inputWithCacheWrite = parseNumber(sanitize(row[idxMap.inputWithCacheWrite!] ?? '0'))
    const inputWithoutCacheWrite = parseNumber(sanitize(row[idxMap.inputWithoutCacheWrite!] ?? '0'))
    const cacheRead = parseNumber(sanitize(row[idxMap.cacheRead!] ?? '0'))
    const output = parseNumber(sanitize(row[idxMap.outputTokens!] ?? '0'))
    const total =
      idxMap.totalTokens !== undefined && idxMap.totalTokens >= 0
        ? parseNumber(sanitize(row[idxMap.totalTokens] ?? '0'))
        : inputWithCacheWrite + inputWithoutCacheWrite + cacheRead + output

    tokenBreakdown = { inputWithCacheWrite, inputWithoutCacheWrite, cacheRead, output, total }
    tokens = total
  } else {
    tokens = parseNumber(sanitize(row[idxMap.tokens] ?? '0'))
  }

  let cost: number | undefined
  if (idxMap.cost >= 0) {
    const costStr = sanitize(row[idxMap.cost] ?? '')
    const lowered = costStr.toLowerCase()
    if (
      lowered === '' ||
      lowered.includes('included') ||
      lowered.includes('not charged') ||
      lowered.includes('errored')
    ) {
      cost = 0
    } else {
      cost = parseNumber(costStr)
    }
  }

  return {
    id: `${parsed.toISOString()}-${model}-${tokens}-${expandedModelName}`,
    date: dateStr,
    timestamp: parsed.getTime(),
    model,
    expandedModelName,
    source: 'cursor_csv',
    tokens,
    tokenBreakdown,
    costUsd: Number.isFinite(cost as number) ? (cost as number) : undefined,
  } as CursorUsageV2
}

const parseCursorCsvText = (text: string, fileName: string): ParsedCursorCsvResult => {
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
    const usage = toUsage(row, {
      date: dateIdx,
      model: modelIdx,
      expandedModel: expandedModelIdx >= 0 ? expandedModelIdx : undefined,
      tokens: tokensIdx,
      cost: costIdx,
      inputWithCacheWrite: inputWithCacheWriteIdx >= 0 ? inputWithCacheWriteIdx : undefined,
      inputWithoutCacheWrite: inputWithoutCacheWriteIdx >= 0 ? inputWithoutCacheWriteIdx : undefined,
      cacheRead: cacheReadIdx >= 0 ? cacheReadIdx : undefined,
      outputTokens: outputTokensIdx >= 0 ? outputTokensIdx : undefined,
      totalTokens: totalTokensIdx >= 0 ? totalTokensIdx : undefined,
    })
    if (!usage || !usage.model) {
      summary.skippedRows += 1
      continue
    }
    parsedRows.push(usage)
    summary.acceptedRows += 1
  }

  return { rows: parsedRows, summary }
}

const looksLikeCcusageJson = (text: string): boolean => {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return false
    const obj = parsed as Record<string, unknown>
    return Array.isArray(obj.daily) || Array.isArray(obj.data) || typeof obj.projects === 'object'
  } catch {
    return false
  }
}

const looksLikeCursorCsv = (text: string): boolean => {
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

const detectFileType = (fileName: string, text: string): DetectedFileType => {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.csv')) return 'cursor_csv'
  if (lowerName.endsWith('.json')) return looksLikeCcusageJson(text) ? 'ccusage_json' : 'unknown'
  if (looksLikeCcusageJson(text)) return 'ccusage_json'
  if (looksLikeCursorCsv(text)) return 'cursor_csv'
  return 'unknown'
}

const sha256Hex = async (text: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function CSVDragDrop({
  onCsvImport,
  onCcusageImport,
  disabled = false,
}: CSVDragDropProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isHelpTooltipVisible, setIsHelpTooltipVisible] = useState(false)
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false)
  const [helpTab, setHelpTab] = useState<HelpTab>('cursor_csv')

  const isHelpTab = (value: unknown): value is HelpTab =>
    value === 'cursor_csv' || value === 'ccusage_json'

  const openHelpDialog = (tab: HelpTab = 'cursor_csv') => {
    setHelpTab(tab)
    setIsHelpDialogOpen(true)
    setIsHelpTooltipVisible(false)
  }

  useEffect(() => {
    if (!isHelpDialogOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHelpDialogOpen(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isHelpDialogOpen])

  useEffect(() => {
    const openRequestedTab = (requestedTab?: unknown) => {
      const tab = isHelpTab(requestedTab) ? requestedTab : 'cursor_csv'
      openHelpDialog(tab)
    }

    const storedTab = window.sessionStorage.getItem(usageHelpDialogStorageKey)
    if (storedTab) {
      openRequestedTab(storedTab)
      window.sessionStorage.removeItem(usageHelpDialogStorageKey)
    }

    const onOpenHelp = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: HelpTab }>).detail
      openRequestedTab(detail?.tab)
    }

    window.addEventListener(usageHelpDialogEventName, onOpenHelp as EventListener)
    return () => window.removeEventListener(usageHelpDialogEventName, onOpenHelp as EventListener)
  }, [])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return

      setIsParsing(true)
      setError(null)

      const csvAll: CursorUsageV2[] = []
      const csvBatches: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }> = []
      const csvSummary: CursorUsageImportSummary = {
        filesProcessed: 0,
        totalRows: 0,
        acceptedRows: 0,
        skippedRows: 0,
        dedupedRows: 0,
        errors: [],
      }

      const ccusageAll: CursorUsageV2[] = []
      const ccusageBatches: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }> = []
      const ccusageSummary: CursorUsageImportSummary = {
        filesProcessed: 0,
        totalRows: 0,
        acceptedRows: 0,
        skippedRows: 0,
        dedupedRows: 0,
        errors: [],
      }

      try {
        for (const file of Array.from(files)) {
          const text = await file.text()
          const fileHash = await sha256Hex(text)
          const detected = detectFileType(file.name, text)

          if (detected === 'cursor_csv') {
            const parsed = parseCursorCsvText(text, file.name)
            csvSummary.filesProcessed += parsed.summary.filesProcessed
            csvSummary.totalRows += parsed.summary.totalRows
            csvSummary.acceptedRows += parsed.summary.acceptedRows
            csvSummary.skippedRows += parsed.summary.skippedRows
            csvSummary.errors.push(...parsed.summary.errors)

            const perFile = dedupeRows(parsed.rows)
            csvSummary.dedupedRows += perFile.dedupedRows
            csvAll.push(...perFile.rows)
            csvBatches.push({
              fileName: file.name,
              fileHash,
              rows: perFile.rows.sort((a, b) => a.timestamp - b.timestamp),
            })
            continue
          }

          if (detected === 'ccusage_json') {
            const parsed = parseCcusageDailyJsonText(text, { includePerModelBreakdown: true })
            ccusageSummary.filesProcessed += 1
            ccusageSummary.totalRows += parsed.summary.totalRows
            ccusageSummary.acceptedRows += parsed.summary.acceptedRows
            ccusageSummary.skippedRows += parsed.summary.skippedRows
            ccusageSummary.dedupedRows += parsed.summary.dedupedRows
            ccusageSummary.errors.push(...parsed.summary.errors.map((e) => `${file.name}: ${e}`))

            ccusageAll.push(...parsed.rows)
            ccusageBatches.push({ fileName: file.name, fileHash, rows: parsed.rows })
            continue
          }

          const typeHint = file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.csv')
            ? `Unsupported file contents: ${file.name}`
            : `Unsupported file type: ${file.name}`
          csvSummary.errors.push(typeHint)
        }

        const dedupedCsvAll = dedupeRows(csvAll)
        csvSummary.dedupedRows += dedupedCsvAll.dedupedRows
        const dedupedCcusageAll = dedupeRows(ccusageAll)
        ccusageSummary.dedupedRows += dedupedCcusageAll.dedupedRows

        if (dedupedCsvAll.rows.length > 0 && onCsvImport) {
          onCsvImport(
            dedupedCsvAll.rows.sort((a, b) => a.timestamp - b.timestamp),
            csvSummary,
            csvBatches
          )
        }

        if (dedupedCcusageAll.rows.length > 0 && onCcusageImport) {
          onCcusageImport(
            dedupedCcusageAll.rows.sort((a, b) => a.timestamp - b.timestamp),
            ccusageSummary,
            ccusageBatches
          )
        }

        const allErrors = [...csvSummary.errors, ...ccusageSummary.errors]
        setError(allErrors.length > 0 ? allErrors[0] : null)
      } finally {
        setIsParsing(false)
      }
    },
    [disabled, onCcusageImport, onCsvImport]
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (disabled) return
      void handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles]
  )

  const onBrowse = useCallback(() => {
    if (disabled) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.json,text/csv,application/json'
    input.multiple = true
    input.onchange = () => {
      if (input.files) void handleFiles(input.files)
    }
    input.click()
  }, [disabled, handleFiles])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
    >
      <div className="mb-2 font-medium inline-flex items-center gap-2">
        <span>Upload usage files (Cursor CSV + ccusage JSON)</span>
        <span className="relative inline-flex">
          <button
            type="button"
            aria-label="Learn more about usage file uploads"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 dark:border-gray-600 dark:text-white/80 dark:hover:text-white dark:hover:border-gray-500 transition-colors"
            onMouseEnter={() => setIsHelpTooltipVisible(true)}
            onMouseLeave={() => setIsHelpTooltipVisible(false)}
            onFocus={() => setIsHelpTooltipVisible(true)}
            onBlur={() => setIsHelpTooltipVisible(false)}
            onClick={(e) => {
              e.stopPropagation()
              openHelpDialog(helpTab)
            }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-9-3a1 1 0 1 1 2 0v.25a2.75 2.75 0 0 1-1.248 2.318l-.344.22A.75.75 0 0 0 9 10.42V11a1 1 0 1 0 2 0v-.58a2.75 2.75 0 0 1 1.248-2.318l.344-.22A.75.75 0 0 0 13 7.25V7a3 3 0 1 0-6 0 1 1 0 0 0 2 0Zm1 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 15Z" clipRule="evenodd" />
            </svg>
          </button>
          {isHelpTooltipVisible && (
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-7 left-1/2 z-20 w-52 -translate-x-1/2 rounded-md border border-neutral-200 bg-white p-2 text-left text-xs text-neutral-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/80"
            >
              Click for more details.
            </div>
          )}
        </span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        Drop files here and we will auto-detect format before routing to the right parser.
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Supported: Cursor CSV export and `ccusage daily --json --breakdown` output.
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onBrowse}
          disabled={disabled || isParsing}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-gunmetal rounded-lg transition-colors duration-200 font-medium shadow disabled:opacity-50"
        >
          Browse files
        </button>
        {isParsing && <span className="text-sm text-gray-600">Parsing...</span>}
        <a
          href="https://cursor.com/dashboard?tab=usage"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-gunmetal rounded-lg transition-colors duration-200 font-medium shadow"
        >
          Cursor Usage
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /><path d="m21 3-9 9" /><path d="M15 3h6v6" /></svg>
        </a>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {isHelpDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsHelpDialogOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white text-left shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Upload File Help
              </h3>
              <button
                type="button"
                onClick={() => setIsHelpDialogOpen(false)}
                className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-white/70 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Close dialog"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-neutral-200 px-5 pt-4 dark:border-gray-700">
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-gray-600 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setHelpTab('cursor_csv')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    helpTab === 'cursor_csv'
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  Cursor CSV Upload
                </button>
                <button
                  type="button"
                  onClick={() => setHelpTab('ccusage_json')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    helpTab === 'ccusage_json'
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                >
                  CC Usage JSON Upload
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4 text-sm text-neutral-700 dark:text-white/80">
              {helpTab === 'cursor_csv' ? (
                <>
                  <p>
                    Use this option to upload your Cursor usage export as CSV.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium text-neutral-900 dark:text-white">How to get the CSV file</p>
                    <ol className="list-decimal space-y-1 pl-5">
                      <li>Open Cursor dashboard and go to the Usage tab.</li>
                      <li>Select the date range you want to analyze.</li>
                      <li>Export the usage data as CSV.</li>
                      <li>Upload the CSV file here by drag-and-drop or browse.</li>
                    </ol>
                  </div>
                  <p>
                    Dashboard link:{' '}
                    <a
                      href="https://cursor.com/dashboard?tab=usage"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      cursor.com/dashboard?tab=usage
                    </a>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Use this option to upload local Claude Code usage from `ccusage` JSON output.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium text-neutral-900 dark:text-white">How to generate the JSON file</p>
                    <ol className="list-decimal space-y-1 pl-5">
                      <li>Open Terminal on your local machine.</li>
                      <li>Run one of these commands:</li>
                    </ol>
                    <div className="rounded-md bg-neutral-100 p-3 font-mono text-xs text-neutral-800 dark:bg-gray-800 dark:text-white/90">
                      npx ccusage@latest daily --json --breakdown &gt; ccusage-daily.json
                    </div>
                    <div className="rounded-md bg-neutral-100 p-3 font-mono text-xs text-neutral-800 dark:bg-gray-800 dark:text-white/90">
                      npm install -g ccusage
                      <br />
                      ccusage daily --json --breakdown &gt; ccusage-daily.json
                    </div>
                    <ol className="list-decimal space-y-1 pl-5" start={3}>
                      <li>Upload `ccusage-daily.json` here by drag-and-drop or browse.</li>
                    </ol>
                  </div>
                  <p>
                    Tool info:{' '}
                    <a
                      href="https://www.npmjs.com/package/ccusage"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:underline dark:text-primary-400"
                    >
                      npmjs.com/package/ccusage
                    </a>
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end border-t border-neutral-200 px-5 py-3 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsHelpDialogOpen(false)}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
