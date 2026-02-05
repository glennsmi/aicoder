import { useCallback, useState } from 'react'
import { CursorUsageImportSummary, CursorUsageV2 } from '@shared'
import { parseCcusageDailyJsonText } from '@/lib/ccusageJson'

interface CcusageJsonDropProps {
  disabled?: boolean
  onImport: (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => void
}

const sha256Hex = async (text: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function CcusageJsonDrop({ disabled = false, onImport }: CcusageJsonDropProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return
    setIsParsing(true)
    setError(null)

    const all: CursorUsageV2[] = []
    const fileBatches: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }> = []
    const errors: string[] = []

    let filesProcessed = 0
    let totalRows = 0
    let acceptedRows = 0
    let skippedRows = 0
    let dedupedRows = 0

    for (const file of Array.from(files)) {
      const name = file.name || 'ccusage.json'
      if (!name.toLowerCase().endsWith('.json')) {
        errors.push(`Unsupported file type: ${name}`)
        continue
      }

      const text = await file.text()
      const fileHash = await sha256Hex(text)

      const { rows, summary } = parseCcusageDailyJsonText(text, { includePerModelBreakdown: true })
      filesProcessed += 1
      totalRows += summary.totalRows
      acceptedRows += summary.acceptedRows
      skippedRows += summary.skippedRows
      dedupedRows += summary.dedupedRows
      errors.push(...summary.errors.map((e) => `${name}: ${e}`))

      all.push(...rows)
      fileBatches.push({ fileName: name, fileHash, rows })
    }

    // Deduplicate across files (id-based)
    const seen = new Set<string>()
    const deduped: CursorUsageV2[] = []
    for (const r of all) {
      if (seen.has(r.id)) {
        dedupedRows += 1
        continue
      }
      seen.add(r.id)
      deduped.push(r)
    }

    const summary: CursorUsageImportSummary = {
      filesProcessed,
      totalRows,
      acceptedRows,
      skippedRows,
      dedupedRows,
      errors,
    }

    if (deduped.length === 0) {
      setError(errors[0] || 'No usage rows found in JSON. Make sure you used `ccusage daily --json`.')
      setIsParsing(false)
      return
    }

    onImport(deduped.sort((a, b) => a.timestamp - b.timestamp), summary, fileBatches)
    setIsParsing(false)
  }, [disabled, onImport])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      void handleFiles(files)
    }
  }, [handleFiles])

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      void handleFiles(files)
    }
    // Allow re-picking the same file
    e.target.value = ''
  }, [handleFiles])

  return (
    <div>
      <div
        className={[
          'rounded-xl border-2 border-dashed p-6 transition-colors duration-200',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
          isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800',
        ].join(' ')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => {
          if (disabled) return
          const el = document.getElementById('ccusage-json-file-input') as HTMLInputElement | null
          el?.click()
        }}
      >
        <input
          id="ccusage-json-file-input"
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={onPick}
          disabled={disabled}
        />

        <div className="text-center">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white">
            Import Claude Code usage (ccusage JSON)
          </div>
          <div className="mt-1 text-sm text-neutral-600 dark:text-white/70">
            Drag & drop your `ccusage daily --json` output here, or click to select.
          </div>
          <div className="mt-3 text-xs text-neutral-500 dark:text-white/60 font-mono">
            Example: <span className="select-all">npx ccusage@latest daily --json --breakdown</span>
          </div>
          {isParsing && (
            <div className="mt-3 text-sm text-neutral-700 dark:text-white/80">
              Parsing JSON…
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  )
}

