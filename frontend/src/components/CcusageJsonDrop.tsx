import { useCallback, useEffect, useState } from 'react'
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
  const [isHelpTooltipVisible, setIsHelpTooltipVisible] = useState(false)
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false)

  useEffect(() => {
    if (!isHelpDialogOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHelpDialogOpen(false)
      }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isHelpDialogOpen])

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
          'border-2 border-dashed rounded-xl p-6 text-center transition-colors duration-200',
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
          isDragging
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-300',
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
          <div className="text-sm font-semibold text-neutral-900 dark:text-white inline-flex items-center gap-2">
            <span>Upload Claude Code usage JSON (ccusage daily)</span>
            <span className="relative inline-flex">
              <button
                type="button"
                aria-label="Learn more about ccusage JSON import"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 dark:border-gray-600 dark:text-white/80 dark:hover:text-white dark:hover:border-gray-500 transition-colors"
                onMouseEnter={() => setIsHelpTooltipVisible(true)}
                onMouseLeave={() => setIsHelpTooltipVisible(false)}
                onFocus={() => setIsHelpTooltipVisible(true)}
                onBlur={() => setIsHelpTooltipVisible(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsHelpDialogOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsHelpDialogOpen(true)
                  }
                }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-9-3a1 1 0 1 1 2 0v.25a2.75 2.75 0 0 1-1.248 2.318l-.344.22A.75.75 0 0 0 9 10.42V11a1 1 0 1 0 2 0v-.58a2.75 2.75 0 0 1 1.248-2.318l.344-.22A.75.75 0 0 0 13 7.25V7a3 3 0 1 0-6 0 1 1 0 0 0 2 0Zm1 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 15Z" clipRule="evenodd" />
                </svg>
              </button>
              {isHelpTooltipVisible && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-7 left-1/2 z-20 w-64 -translate-x-1/2 rounded-md border border-neutral-200 bg-white p-2 text-left text-xs text-neutral-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white/80"
                >
                  Generate this JSON locally with the `ccusage` CLI, then upload it here. Click for full setup steps.
                </div>
              )}
            </span>
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

      {isHelpDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsHelpDialogOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                About Claude Code ccusage JSON import
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

            <div className="space-y-4 px-5 py-4 text-sm text-neutral-700 dark:text-white/80">
              <p>
                This import accepts the JSON report generated by the `ccusage` CLI (`daily` report with JSON output).
                It brings Claude Code usage into your charts alongside CSV uploads.
              </p>

              <div className="space-y-2">
                <p className="font-medium text-neutral-900 dark:text-white">How to generate the file</p>
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
              </div>

              <p>
                Then upload `ccusage-daily.json` in this box using drag-and-drop or click-to-select.
              </p>

              <p>
                Tool info:
                {' '}
                <a
                  href="https://www.npmjs.com/package/ccusage"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 hover:underline dark:text-primary-400"
                >
                  npmjs.com/package/ccusage
                </a>
              </p>
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

