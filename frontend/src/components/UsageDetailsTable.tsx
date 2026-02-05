import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CursorUsageV2 } from '@shared'

type Props = {
  rows: CursorUsageV2[]
  /**
   * Total number of rows that match the current filters (before top-K).
   * Used for the "Showing K of N" label.
   */
  totalMatching: number
  limit: number
  onChangeLimit?: (next: number) => void
  className?: string
  title?: string
}

function formatTokens(value: number) {
  const rounded = Math.round(value)
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatCurrencyUsd(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(ms: number) {
  const d = new Date(ms)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UsageDetailsTable({
  rows,
  totalMatching,
  limit,
  onChangeLimit,
  className,
  title = 'Details (most recent)',
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const safeRows = useMemo(() => rows.filter(Boolean), [rows])

  const rowVirtualizer = useVirtualizer({
    count: safeRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  })

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Showing <span className="font-semibold">{safeRows.length}</span> of{' '}
            <span className="font-semibold">{totalMatching}</span> matching rows (top‑K limit: {limit})
          </div>
        </div>

        {onChangeLimit && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">Show:</span>
            {[200, 500, 1000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChangeLimit(n)}
                className={[
                  'px-2 py-1 text-xs rounded-md border transition-colors',
                  n === limit
                    ? 'bg-secondary-900 text-white border-secondary-900'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[210px_1fr_110px_110px_110px_110px] gap-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
          <div>Date</div>
          <div>Model</div>
          <div className="text-right">Input</div>
          <div className="text-right">Output</div>
          <div className="text-right">Total</div>
          <div className="text-right">Cost (USD)</div>
        </div>

        {/* Virtualized body */}
        <div ref={parentRef} className="h-[420px] overflow-auto">
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((v) => {
              const row = safeRows[v.index]!
              const inputTokens = row.tokenBreakdown
                ? (row.tokenBreakdown.inputWithCacheWrite || 0) + (row.tokenBreakdown.inputWithoutCacheWrite || 0)
                : 0
              const outputTokens = row.tokenBreakdown ? (row.tokenBreakdown.output || 0) : 0

              return (
                <div
                  key={row.id ?? v.key}
                  className={[
                    'absolute left-0 right-0 grid grid-cols-[210px_1fr_110px_110px_110px_110px] px-3 py-2',
                    'text-sm text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700/60',
                    v.index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-900/20',
                  ].join(' ')}
                  style={{ transform: `translateY(${v.start}px)` }}
                >
                  <div className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">
                    {formatDateTime(row.timestamp)}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      {row.model}
                    </span>
                  </div>
                  <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {formatTokens(inputTokens)}
                  </div>
                  <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {formatTokens(outputTokens)}
                  </div>
                  <div className="text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                    {formatTokens(row.tokens || 0)}
                  </div>
                  <div className="text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {row.costUsd ? `$${formatCurrencyUsd(row.costUsd)}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

