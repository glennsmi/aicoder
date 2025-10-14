import { useCallback, useState } from 'react'
import { CursorUsageV2, CursorUsageImportSummary, TokenBreakdown } from '@shared'

interface CSVDragDropProps {
  onImport: (data: CursorUsageV2[], summary: CursorUsageImportSummary) => void
  disabled?: boolean
}

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
      // Toggle quotes, but handle escaped quotes ""
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
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }
  const headerRow = lines[0]
  const delimiter = headerRow.indexOf('\t') !== -1 ? '\t' : ','
  const headers = parseCsvLine(headerRow, delimiter).map(normalizeHeader)
  const rows = lines.slice(1).map(line => parseCsvLine(line, delimiter))
  return { headers, rows }
}

const findHeaderIndex = (headers: string[], candidates: string[]): number => {
  for (const c of candidates.map(normalizeHeader)) {
    const idx = headers.findIndex(h => h.includes(c))
    if (idx !== -1) return idx
  }
  return -1
}

const toUsage = (row: string[], idxMap: { 
  date: number; 
  model: number; 
  tokens: number; 
  cost: number;
  inputWithCacheWrite?: number;
  inputWithoutCacheWrite?: number;
  cacheRead?: number;
  outputTokens?: number;
  totalTokens?: number;
}) => {
  const rawDate = row[idxMap.date] ?? ''
  const dateStr = sanitize(rawDate)
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return null
  const model = sanitize(row[idxMap.model] ?? '')
  
  // Try to get total tokens first from the new format
  let tokens = 0
  let tokenBreakdown: TokenBreakdown | undefined
  
  // Check if we have the new detailed token format
  const hasNewFormat = idxMap.inputWithCacheWrite !== undefined && 
                       idxMap.inputWithCacheWrite >= 0 &&
                       idxMap.outputTokens !== undefined &&
                       idxMap.outputTokens >= 0
  
  if (hasNewFormat) {
    const inputWithCacheWrite = parseNumber(sanitize(row[idxMap.inputWithCacheWrite!] ?? '0'))
    const inputWithoutCacheWrite = parseNumber(sanitize(row[idxMap.inputWithoutCacheWrite!] ?? '0'))
    const cacheRead = parseNumber(sanitize(row[idxMap.cacheRead!] ?? '0'))
    const output = parseNumber(sanitize(row[idxMap.outputTokens!] ?? '0'))
    const total = idxMap.totalTokens !== undefined && idxMap.totalTokens >= 0 
      ? parseNumber(sanitize(row[idxMap.totalTokens] ?? '0'))
      : inputWithCacheWrite + inputWithoutCacheWrite + cacheRead + output
    
    tokenBreakdown = {
      inputWithCacheWrite,
      inputWithoutCacheWrite,
      cacheRead,
      output,
      total
    }
    tokens = total
  } else {
    // Fallback to old format
    tokens = parseNumber(sanitize(row[idxMap.tokens] ?? '0'))
  }
  
  // Handle cost column - prefer CSV cost. Treat non-charged rows as 0
  let cost: number | undefined
  if (idxMap.cost >= 0) {
    const costStr = sanitize(row[idxMap.cost] ?? '')
    const lowered = costStr.toLowerCase()
    if (lowered === '' || lowered.includes('included') || lowered.includes('not charged') || lowered.includes('errored')) {
      cost = 0
    } else {
      cost = parseNumber(costStr)
    }
  }
  
  const id = `${parsed.toISOString()}-${model}-${tokens}`
  const usage: CursorUsageV2 = {
    id,
    date: dateStr,
    timestamp: parsed.getTime(),
    model,
    tokens,
    tokenBreakdown,
    costUsd: Number.isFinite(cost!) ? (cost as number) : undefined,
  }
  return usage
}

export default function CSVDragDrop({ onImport, disabled = false }: CSVDragDropProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return
    console.log('🔄 CSVDragDrop: Starting file processing...', files.length, 'files')
    setIsParsing(true)
    setError(null)

    const all: CursorUsageV2[] = []
    let filesProcessed = 0
    let totalRows = 0
    let acceptedRows = 0
    let skippedRows = 0
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        errors.push(`Unsupported file type: ${file.name}`)
        console.log('❌ CSVDragDrop: Skipping non-CSV file:', file.name)
        continue
      }
      console.log('📁 CSVDragDrop: Processing file:', file.name, 'size:', file.size)
      const text = await file.text()
      console.log('📄 CSVDragDrop: File content length:', text.length, 'chars')
      const { headers, rows } = parseCsvText(text)
      console.log('🔍 CSVDragDrop: Parsed headers:', headers, 'rows:', rows.length)
      const dateIdx = findHeaderIndex(headers, ['date'])
      const modelIdx = findHeaderIndex(headers, ['model'])
      const tokensIdx = findHeaderIndex(headers, ['tokens', 'token', 'total tokens'])
      const costIdx = findHeaderIndex(headers, ['cost ($)', 'cost'])
      
      // New token columns from updated CSV format
      const inputWithCacheWriteIdx = findHeaderIndex(headers, ['input (w/ cache write)', 'input with cache write'])
      const inputWithoutCacheWriteIdx = findHeaderIndex(headers, ['input (w/o cache write)', 'input without cache write'])
      const cacheReadIdx = findHeaderIndex(headers, ['cache read'])
      const outputTokensIdx = findHeaderIndex(headers, ['output tokens', 'output'])
      const totalTokensIdx = findHeaderIndex(headers, ['total tokens', 'total'])
      
      console.log('📍 CSVDragDrop: Column indices - date:', dateIdx, 'model:', modelIdx, 'tokens:', tokensIdx, 'cost:', costIdx)
      console.log('📍 CSVDragDrop: New token columns - inputWithCacheWrite:', inputWithCacheWriteIdx, 'inputWithoutCacheWrite:', inputWithoutCacheWriteIdx, 'cacheRead:', cacheReadIdx, 'output:', outputTokensIdx, 'total:', totalTokensIdx)
      
      // For new format, we need date, model, and at least some token fields
      const hasNewFormat = inputWithCacheWriteIdx !== -1 && outputTokensIdx !== -1
      if (dateIdx === -1 || modelIdx === -1) {
        errors.push(`Missing required headers (date, model) in ${file.name}`)
        console.log('❌ CSVDragDrop: Missing required headers in', file.name)
        continue
      }
      if (!hasNewFormat && tokensIdx === -1) {
        errors.push(`Missing token data in ${file.name}`)
        console.log('❌ CSVDragDrop: Missing token data in', file.name)
        continue
      }
      
      filesProcessed += 1
      totalRows += rows.length
      console.log('✅ CSVDragDrop: File', file.name, 'passed validation, processing', rows.length, 'rows')
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const u = toUsage(row, { 
          date: dateIdx, 
          model: modelIdx, 
          tokens: tokensIdx, 
          cost: costIdx,
          inputWithCacheWrite: inputWithCacheWriteIdx >= 0 ? inputWithCacheWriteIdx : undefined,
          inputWithoutCacheWrite: inputWithoutCacheWriteIdx >= 0 ? inputWithoutCacheWriteIdx : undefined,
          cacheRead: cacheReadIdx >= 0 ? cacheReadIdx : undefined,
          outputTokens: outputTokensIdx >= 0 ? outputTokensIdx : undefined,
          totalTokens: totalTokensIdx >= 0 ? totalTokensIdx : undefined,
        })
        if (!u || !u.model) {
          skippedRows += 1
          console.log('⚠️ CSVDragDrop: Skipping invalid row', i, ':', row, '->', u)
          continue
        }
        all.push({ ...u, raw: undefined })
        acceptedRows += 1
      }
    }

    console.log('📊 CSVDragDrop: Processing complete. All rows:', all.length, 'accepted:', acceptedRows, 'skipped:', skippedRows)

    // Deduplicate across files
    const seen = new Set<string>()
    const deduped: CursorUsageV2[] = []
    let dedupedRows = 0
    for (const u of all) {
      const key = `${u.timestamp}-${u.model}-${u.tokens}-${u.costUsd ?? 0}`
      if (seen.has(key)) {
        dedupedRows += 1
        console.log('🔄 CSVDragDrop: Deduping row:', u.id, 'key:', key)
        continue
      }
      seen.add(key)
      deduped.push(u)
    }

    console.log('🎯 CSVDragDrop: Dedup complete. Final rows:', deduped.length, 'deduped:', dedupedRows)

    const summary: CursorUsageImportSummary = {
      filesProcessed,
      totalRows,
      acceptedRows,
      skippedRows,
      dedupedRows,
      errors,
    }

    console.log('📤 CSVDragDrop: Calling onImport with', deduped.length, 'rows and summary:', summary)
    onImport(deduped.sort((a, b) => a.timestamp - b.timestamp), summary)
    setIsParsing(false)
  }, [disabled, onImport])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('📥 CSVDragDrop: Drop event triggered with', e.dataTransfer.files.length, 'files')
    setIsDragging(false)
    if (disabled) return
    const files = e.dataTransfer.files
    console.log('📁 CSVDragDrop: Files to process:', Array.from(files).map(f => f.name))
    handleFiles(files)
  }, [disabled, handleFiles])

  const onBrowse = useCallback(() => {
    if (disabled) return
    console.log('🔍 CSVDragDrop: Browse button clicked')
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.multiple = true
    input.onchange = () => {
      console.log('📁 CSVDragDrop: File input change event, files:', input.files?.length)
      if (input.files) handleFiles(input.files)
    }
    input.click()
  }, [disabled, handleFiles])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-6 text-center ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
    >
      <div className="mb-2 font-medium">Upload CSV files (multi-file supported)</div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Drag and drop, browse to select, or download your usage data from Cursor.
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onBrowse}
          disabled={disabled || isParsing}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-gunmetal rounded-lg transition-colors duration-200 font-medium shadow disabled:opacity-50"
        >
          Browse CSVs
          
        </button>
        {isParsing && <span className="text-sm text-gray-600">Parsing…</span>}
        <a
          href="https://cursor.com/dashboard?tab=usage"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-gunmetal rounded-lg transition-colors duration-200 font-medium shadow"
        >
          Cursor Usage

          <svg xmlns="http://www.w3.org/2000/svg"  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="ml-2"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="m21 3-9 9"/><path d="M15 3h6v6"/></svg>
        </a>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  )
}
