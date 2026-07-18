import { useMemo, useState } from 'react'
import { CursorUsageV2 as CursorUsage } from '@shared'
import * as Popover from '@radix-ui/react-popover'

interface CursorCostsTableProps {
  data: CursorUsage[]
}

type HoverPopoverProps = {
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  collisionPadding?: number
  contentClassName?: string
}

function HoverPopover({
  trigger,
  children,
  side = 'top',
  align = 'start',
  sideOffset = 8,
  collisionPadding = 12,
  contentClassName,
}: HoverPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <span
          className="inline-block"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          {trigger}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={[
            'z-[100000] outline-none',
            contentClassName ?? '',
          ].join(' ')}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default function CursorCostsTable({ data }: CursorCostsTableProps) {
  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'model' | 'tokens' | 'cost'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  // Expanded rows for token breakdown
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleSort = (col: 'date' | 'model' | 'tokens' | 'cost') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatTokens = (value: number) => {
    const rounded = Math.round(value)
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const formatDate = (row: CursorUsage) => {
    const ts = (row as any).timestamp
    const date = typeof ts === 'number' ? new Date(ts) : new Date(row.date)
    if (isNaN(date.getTime())) return row.date
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yy = String(date.getFullYear()).slice(-2)
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${days[date.getDay()]} ${dd}-${mm}-${yy} ${hh}:${min}`
  }

  // Sort and calculate running totals
  const dataWithTotals = useMemo(() => {
    const copy = [...data]

    copy.sort((a, b) => {
      if (sortBy === 'date') {
        const at = (a as any).timestamp ?? Date.parse(a.date)
        const bt = (b as any).timestamp ?? Date.parse(b.date)
        return sortDir === 'asc' ? at - bt : bt - at
      }
      if (sortBy === 'model') {
        const cmp = a.model.localeCompare(b.model)
        return sortDir === 'asc' ? cmp : -cmp
      }
      if (sortBy === 'tokens') {
        const at = a.tokens || 0
        const bt = b.tokens || 0
        return sortDir === 'asc' ? at - bt : bt - at
      }
      // cost
      const ac = a.costUsd || 0
      const bc = b.costUsd || 0
      return sortDir === 'asc' ? ac - bc : bc - ac
    })

    let runningTokens = 0
    let runningCost = 0
    return copy.map(row => {
      const tokens = typeof row.tokens === 'number' ? row.tokens : 0
      const cost = typeof row.costUsd === 'number' ? row.costUsd : 0
      runningTokens += tokens
      runningCost += cost
      const costPerToken = tokens > 0 ? cost / tokens : 0
      const runningCostPerToken = runningTokens > 0 ? runningCost / runningTokens : 0
      return { ...row, tokens, costUsd: cost, runningTokens, runningCost, costPerToken, runningCostPerToken }
    })
  }, [data, sortBy, sortDir])

  const totals = useMemo(() => {
    if (dataWithTotals.length === 0) return { tokens: 0, cost: 0, costPerToken: 0, inputTokens: 0, outputTokens: 0 }
    const last = dataWithTotals[dataWithTotals.length - 1]
    
    // Calculate total input and output tokens
    const totalInputTokens = dataWithTotals.reduce((sum, row) => {
      if (row.tokenBreakdown) {
        return sum + row.tokenBreakdown.inputWithCacheWrite + row.tokenBreakdown.inputWithoutCacheWrite
      }
      return sum
    }, 0)
    
    const totalOutputTokens = dataWithTotals.reduce((sum, row) => {
      if (row.tokenBreakdown) {
        return sum + row.tokenBreakdown.output
      }
      return sum
    }, 0)
    
    return { 
      tokens: last.runningTokens || 0, 
      cost: last.runningCost || 0,
      costPerToken: last.runningCostPerToken || 0,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    }
  }, [dataWithTotals])

  return (
    <div className="overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gunmetal-900 to-secondary-800 text-white dark:from-gray-900 dark:to-gray-800">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('date')}>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Date{sortBy==='date' ? (sortDir==='asc' ? ' ↑' : ' ↓') : ''}</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('model')}>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Model{sortBy==='model' ? (sortDir==='asc' ? ' ↑' : ' ↓') : ''}</span>
                </div>
              </th>
              
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Input Tokens</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Output Tokens</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('tokens')}>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Total{sortBy==='tokens' ? (sortDir==='asc' ? ' ↑' : ' ↓') : ''}</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('cost')}>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Cost ${sortBy==='cost' ? (sortDir==='asc' ? ' ↑' : ' ↓') : ''}</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider bg-primary-600">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Total Tokens</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider bg-secondary-800">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Total $ Cost</span>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider bg-accent-600">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Cost per Token</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-neutral-200 dark:divide-gray-700">
            {dataWithTotals.map((row, index) => {
              const hasTokenBreakdown = row.tokenBreakdown !== undefined
              const isExpanded = expandedRows.has(row.id || String(index))
              const totalInputTokens = hasTokenBreakdown && row.tokenBreakdown
                ? row.tokenBreakdown.inputWithCacheWrite + row.tokenBreakdown.inputWithoutCacheWrite
                : 0
              const outputTokens = hasTokenBreakdown && row.tokenBreakdown ? row.tokenBreakdown.output : 0
              
              return (
                <>
                  <tr 
                    key={row.id || index}
                    className={`
                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-neutral-50 dark:bg-gray-900'}
                      hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors duration-150 group
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-gray-200">
                      <div className="flex items-center space-x-2">
                        {hasTokenBreakdown && (
                          <button
                            onClick={() => toggleRowExpansion(row.id || String(index))}
                            className="w-4 h-4 flex items-center justify-center text-primary-500 hover:text-primary-700 transition-colors"
                            title={isExpanded ? "Hide token breakdown" : "Show token breakdown"}
                          >
                            {isExpanded ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                        )}
                        <div className="w-2 h-2 bg-primary-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <span>{formatDate(row)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-gray-700 text-text-primary dark:text-gray-200 group-hover:bg-primary-100 dark:group-hover:bg-gray-600 group-hover:text-primary-800 transition-colors">
                        {row.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                      {hasTokenBreakdown && row.tokenBreakdown ? (
                        <HoverPopover
                          trigger={(
                            <span className="inline-flex items-center gap-2">
                              <span className="text-lg">{formatTokens(totalInputTokens)}</span>
                              <span className="text-xs text-text-secondary">tokens</span>
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                          side="top"
                          align="start"
                          contentClassName="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl w-72"
                        >
                          <div className="font-semibold mb-2 text-primary-300">Input Token Breakdown</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-200">Input Tokens (Total):</span>
                              <span className="font-medium text-gray-200">{formatTokens(totalInputTokens)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Input (w/o cache write):</span>
                              <span className="font-medium">{formatTokens(row.tokenBreakdown.inputWithoutCacheWrite)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-orange-300">Cache Write:</span>
                              <span className="font-medium text-orange-300">{formatTokens(row.tokenBreakdown.inputWithCacheWrite)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-300">Output Tokens:</span>
                              <span className="font-medium text-green-300">{formatTokens(row.tokenBreakdown.output)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 font-semibold">
                              <span className="text-gray-200">I/O Subtotal:</span>
                              <span className="font-medium text-gray-200">{formatTokens(totalInputTokens + row.tokenBreakdown.output)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-300">Cache Read:</span>
                              <span className="font-medium text-purple-300">{formatTokens(row.tokenBreakdown.cacheRead)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                              <span>Total:</span>
                              <span>{formatTokens(row.tokenBreakdown.total)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                            💡 Cache tokens are less expensive
                          </div>
                        </HoverPopover>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{formatTokens(0)}</span>
                          <span className="text-xs text-text-secondary">tokens</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{formatTokens(outputTokens)}</span>
                        <span className="text-xs text-text-secondary">tokens</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                      {hasTokenBreakdown && row.tokenBreakdown ? (
                        <HoverPopover
                          trigger={(
                            <span className="inline-flex items-center gap-2">
                              <span className="text-lg">{formatTokens(row.tokens)}</span>
                              <span className="text-xs text-text-secondary">tokens</span>
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                          side="top"
                          align="start"
                          contentClassName="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl w-80"
                        >
                          <div className="font-semibold mb-2 text-primary-300">Complete Token Breakdown</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-blue-200">
                              <span>Input Tokens (Total):</span>
                              <span className="font-medium">{formatTokens(totalInputTokens)}</span>
                            </div>
                            <div className="flex justify-between text-gray-200/90">
                              <span>Input (w/o cache write):</span>
                              <span className="font-medium">{formatTokens(row.tokenBreakdown.inputWithoutCacheWrite)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-orange-200">
                              <span>Cache Write:</span>
                              <span className="font-medium">{formatTokens(row.tokenBreakdown.inputWithCacheWrite)}</span>
                            </div>
                            <div className="flex justify-between text-green-200">
                              <span>Output Tokens:</span>
                              <span className="font-medium">{formatTokens(row.tokenBreakdown.output)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-gray-200 font-semibold">
                              <span>I/O Subtotal:</span>
                              <span className="font-medium">{formatTokens(totalInputTokens + row.tokenBreakdown.output)}</span>
                            </div>
                            <div className="flex justify-between text-purple-200">
                              <span>Cache Read:</span>
                              <span className="font-medium">{formatTokens(row.tokenBreakdown.cacheRead)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                              <span>Total:</span>
                              <span>{formatTokens(row.tokenBreakdown.total)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                            💡 I/O: {formatTokens(totalInputTokens + row.tokenBreakdown.output)} | Cache Write: {formatTokens(row.tokenBreakdown.inputWithCacheWrite)} | Cache Read: {formatTokens(row.tokenBreakdown.cacheRead)}
                          </div>
                        </HoverPopover>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{formatTokens(row.tokens)}</span>
                          <span className="text-xs text-text-secondary">tokens</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary-800 dark:text-gray-200">
                      {formatCurrency(row.costUsd || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-700 bg-primary-50 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-gray-700 transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{formatTokens(row.runningTokens)}</span>
                        <div className="w-8 h-1 bg-primary-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 transition-all duration-300"
                            style={{ width: `${Math.min((row.runningTokens / Math.max(...dataWithTotals.map(d => d.runningTokens))) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-secondary-800 dark:text-gray-200 bg-secondary-50 dark:bg-gray-800 group-hover:bg-secondary-100 dark:group-hover:bg-gray-700 transition-colors">
                      <div className="flex items-center space-x-2">
                        <span>{formatCurrency(row.runningCost)}</span>
                        <div className="w-8 h-1 bg-secondary-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-secondary-600 transition-all duration-300"
                            style={{ width: `${Math.min((row.runningCost / Math.max(...dataWithTotals.map(d => d.runningCost))) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-accent-700 dark:text-gray-200 bg-accent-50 dark:bg-gray-800 group-hover:bg-accent-100 dark:group-hover:bg-gray-700 transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">${row.runningCostPerToken.toFixed(6)}</span>
                        <div className="w-8 h-1 bg-accent-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent-500 transition-all duration-300"
                            style={{ width: `${Math.min((row.runningCostPerToken / Math.max(...dataWithTotals.map(d => d.runningCostPerToken))) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded row for token breakdown */}
                  {hasTokenBreakdown && isExpanded && row.tokenBreakdown && (
                    <tr className="bg-blue-50 dark:bg-gray-900 border-l-4 border-primary-500">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="ml-8">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Token Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Input (w/ Cache Write)</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatTokens(row.tokenBreakdown.inputWithCacheWrite)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Input (w/o Cache Write)</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatTokens(row.tokenBreakdown.inputWithoutCacheWrite)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cache Read</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatTokens(row.tokenBreakdown.cacheRead)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Output</div>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatTokens(row.tokenBreakdown.output)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            <strong>Total I/O Tokens:</strong> {formatTokens(totalInputTokens + outputTokens)} 
                            <span className="ml-4"><strong>Cache Read (less expensive):</strong> {formatTokens(row.tokenBreakdown.cacheRead)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Enhanced Table Footer */}
      <div className="bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-gray-900 dark:to-gray-800 px-6 py-6 border-t-2 border-neutral-300 dark:border-gray-700 text-gunmetal dark:text-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-text-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{data.length} {data.length === 1 ? 'entry' : 'entries'} total</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-soft border border-blue-200 dark:border-gray-600">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-semibold text-text-primary">Input Tokens:</span>
              <span className="text-lg font-bold text-blue-600">{formatTokens(totals.inputTokens)}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-soft border border-green-200 dark:border-gray-600">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-semibold text-text-primary">Output Tokens:</span>
              <span className="text-lg font-bold text-green-600">{formatTokens(totals.outputTokens)}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-soft border border-primary-200 dark:border-gray-600">
              <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
              <span className="text-sm font-semibold text-text-primary">Total Tokens:</span>
              <span className="text-lg font-bold text-primary-600">{formatTokens(totals.tokens)}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-soft border border-secondary-200 dark:border-gray-600">
              <div className="w-3 h-3 bg-secondary-800 rounded-full"></div>
              <span className="text-sm font-semibold text-text-primary">Total Cost:</span>
              <span className="text-lg font-bold text-secondary-800">{formatCurrency(totals.cost)}</span>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-soft border border-accent-200 dark:border-gray-600">
              <div className="w-3 h-3 bg-accent-600 rounded-full"></div>
              <span className="text-sm font-semibold text-text-primary">Avg Cost/Token:</span>
              <span className="text-lg font-bold text-accent-700">${totals.costPerToken.toFixed(6)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 