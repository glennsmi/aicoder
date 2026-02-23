import React, { useMemo, useState, useRef, useCallback, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts'
import * as htmlToImage from 'html-to-image';
import { BarChart3 } from 'lucide-react'
import { CursorUsageV2 as CursorUsage } from '@shared'
import { cn } from '@/lib/utils'
import { DateRangePicker } from './DateRangePicker'
import { DateRange } from 'react-day-picker'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import CurrencySelector from './CurrencySelector'
import TimeRangeSegmentedControl from './TimeRangeSegmentedControl'
import * as Popover from '@radix-ui/react-popover'
import { aggregateCursorUsageV2ToHourlyByModel } from '@/lib/hourlyBuckets'

const CORE_MODEL_COLORS = [
  // Primary vibrant colors (base palette) - strategically ordered for maximum distinction
  '#0097D7', // Blue
  '#D70097', // Magenta/Pink
  '#00D7AC', // Teal/Cyan
  '#D7AC00', // Gold/Yellow
  '#FF6B6B', // Red
  '#4ECDC4', // Light Teal
  '#45B7D1', // Light Blue
  '#96CEB4', // Mint Green
  '#FFC324', // Orange/Yellow
  '#FFEAA7', // Pale Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Seafoam
  '#F7DC6F', // Light Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Sky Blue
  '#F8C471', // Peach
  '#82E0AA', // Light Green
  '#AED6F1', // Powder Blue
  '#F1948A', // Salmon
  '#D7BDE2', // Light Purple
] as const

interface CursorUsageChartProps {
  data: CursorUsage[]
  isLoading?: boolean
  costDifference?: number | null
  lastPastedDataCost?: number
  /**
   * Optional: notify parent when the chart's active time window changes.
   * Useful for keeping leaderboards/other UI in sync with the chart.
   */
  onActiveWindowChange?: (window: { startMs: number | null; endMs: number | null }) => void
}

interface ChartData {
  date: string
  fullDate: Date
  [model: string]: string | number | Date
}

type TimePeriod = 'last7d' | 'last14d' | 'last30d' | 'last3m' | 'custom'
type PresetTimePeriod = Exclude<TimePeriod, 'custom'>
type GroupByMode = 'model' | 'expandedModel' | 'source'

const FRIENDLY_SOURCE_LABELS: Record<string, string> = {
  cursor_csv: 'Cursor CSV Upload',
  ccusage_daily_json: 'Claude Code Usage',
  'claude code desktop api': 'Claude Code Desktop API',
  claude_code_usage: 'Claude Code Usage',
  anthropic_usage_api: 'Anthropic Usage API',
  anthropic_code_api: 'Anthropic Code API',
  openai_api: 'OpenAI API',
  github_copilot_api: 'GitHub Copilot API',
  gemini_api: 'Gemini API',
  codeium_api: 'Codeium API',
}

function toFriendlySourceLabel(raw: string): string {
  const key = String(raw || '').trim().toLowerCase()
  if (!key) return 'Unknown Source'
  if (FRIENDLY_SOURCE_LABELS[key]) return FRIENDLY_SOURCE_LABELS[key]
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
  align = 'end',
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
          className={cn(
            'z-[100000] outline-none',
            contentClassName,
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function isSplitUnknownModelName(model: string): boolean {
  const m = (model || '').toLowerCase().trim()
  // Cursor CSV model names we’ve seen: "gpt-5.2"
  // Also cover common OpenAI and Gemini prefixes where we treat the input/cache-write split as unknown.
  return (
    m.startsWith('gpt') ||
    m.startsWith('o1') ||
    m.startsWith('o3') ||
    m.startsWith('o4') ||
    m.includes('openai') ||
    m.startsWith('gemini') ||
    m.includes('google') ||
    m.includes('vertex')
  )
}

function percentOfTotal(part: number, total: number): string | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null
  const pct = (part / total) * 100
  if (!Number.isFinite(pct)) return null
  return `${pct.toFixed(1)}%`
}

export default function CursorUsageChart({
  data,
  isLoading = false,
  costDifference,
  lastPastedDataCost,
  onActiveWindowChange,
}: CursorUsageChartProps) {
  // Smallest supported unit is hourly. Daily is derived from hourly.
  const [aggregationMode, setAggregationMode] = useState<'day' | 'hour'>('hour')
  const [metricMode, setMetricMode] = useState<'tokens' | 'costs'>('tokens')
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('model')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last30d')
  const [presetAnchorMs, setPresetAnchorMs] = useState<number | null>(null) // end of window for 1D/2D/1W/1M
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [customStartTime, setCustomStartTime] = useState<string>('00:00')
  const [customEndTime, setCustomEndTime] = useState<string>('23:59')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [zoomRange, setZoomRange] = useState<{start: number, end: number} | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const entireChartRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth()
  const { organization } = useOrganization()
  const { userCurrency, formatCurrency, convertFromUSD } = useCurrency()
  const { actualTheme } = useTheme()
  const [showCurrencySelectorModal, setShowCurrencySelectorModal] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState<string>('')
  // Click-to-select model highlight (avoid hover updates for large datasets)
  // We keep an "immediate UI selection" + a transitioned "chart selection" so the
  // row highlight is instant even if the chart takes a moment to repaint.
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [selectedModelForChart, setSelectedModelForChart] = useState<string | null>(null)
  const [isHighlightPending, startHighlightTransition] = useTransition()
  const [referenceModel, setReferenceModel] = useState<string | null>(null)
  const displayGroupName = useCallback(
    (name: string) => (groupByMode === 'source' ? toFriendlySourceLabel(name) : name),
    [groupByMode]
  )

  const useWhiteLabelBranding = Boolean(organization?.settings?.reports?.whiteLabelBranding)
  const orgDisplayName = (organization?.name || '').trim()

  // Crossfilter-inspired: shrink working set early (hour buckets by model).
  const hourlyData = useMemo(
    () =>
      aggregateCursorUsageV2ToHourlyByModel(data, {
        groupBy: groupByMode,
      }),
    [data, groupByMode]
  )

  const resolveGroupName = useCallback(
    (usage: CursorUsage): string => {
      if (groupByMode === 'expandedModel') {
        const rawExpandedModelName = Array.isArray((usage.raw as any)?.expandedModelNames)
          ? String(((usage.raw as any).expandedModelNames as unknown[]).find((v) => String(v || '').trim()) || '').trim()
          : ''
        return String(usage.expandedModelName || rawExpandedModelName || usage.model || '').trim()
      }
      if (groupByMode === 'source') {
        return String(usage.source || usage.model || '').trim()
      }
      return String(usage.model || '').trim()
    },
    [groupByMode]
  )

  type ModelBreakdownSortKey =
    | 'model'
    | 'inputTokens'
    | 'inputWithoutCacheWriteTokens'
    | 'inputWithCacheWriteTokens'
    | 'cacheReadTokens'
    | 'outputTokens'
    | 'totalTokens'
    | 'costUsd'
    | 'costUserCurrency'
    | 'costPerMillionInputTokensUsd'
    | 'costPerMillionOutputTokensUsd'

  const [modelBreakdownSortKey, setModelBreakdownSortKey] = useState<ModelBreakdownSortKey>('totalTokens')
  const [modelBreakdownSortDir, setModelBreakdownSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSelectedModel = (model: string) => {
    setSelectedModel((prev) => {
      const next = prev === model ? null : model
      startHighlightTransition(() => setSelectedModelForChart(next))
      return next
    })
  }

  const clearSelectedModel = () => {
    setSelectedModel(null)
    startHighlightTransition(() => setSelectedModelForChart(null))
  }

  const handleCopyChart = async () => {
    if (entireChartRef.current === null) {
      return;
    }
    try {
      // Find the copy elements and temporarily show them for copying
      const topBar = entireChartRef.current.querySelector('.top-bar');
      const sourceBand = entireChartRef.current.querySelector('.source-band');
      const copyPadding = entireChartRef.current.querySelector('.copy-padding');
      const copyButton = entireChartRef.current.querySelector('button[title="Copy chart as image"]');
      
      if (topBar) {
        topBar.classList.remove('hidden');
      }
      if (sourceBand) {
        sourceBand.classList.remove('hidden');
      }
      if (copyPadding) {
        copyPadding.classList.remove('hidden');
      }
      if (copyButton) {
        copyButton.classList.add('hidden');
      }
      
      const dataUrl = await htmlToImage.toPng(entireChartRef.current, {
        quality: 0.95,
        backgroundColor: actualTheme === 'dark' ? '#1f2937' : '#ffffff',
        pixelRatio: 2,
      });
      
      // Hide the copy elements again after copying
      if (topBar) {
        topBar.classList.add('hidden');
      }
      if (sourceBand) {
        sourceBand.classList.add('hidden');
      }
      if (copyPadding) {
        copyPadding.classList.add('hidden');
      }
      if (copyButton) {
        copyButton.classList.remove('hidden');
      }
      
      const blob = await fetch(dataUrl).then(res => res.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedMessage('Chart copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy chart: ', err);
      setCopiedMessage('Failed to copy chart.');
    }
    setTimeout(() => setCopiedMessage(''), 3000);
  };

  // Get data boundaries for validation
  const getDataBoundaries = () => {
    if (hourlyData.length === 0) return { earliest: new Date(), latest: new Date() }
    
    const dates = hourlyData.map(usage => new Date((usage as any).timestamp))
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
    const latest = new Date(Math.max(...dates.map(d => d.getTime())))
    
    return { earliest, latest }
  }

  // Auto-adjust chart settings when new data is imported
  useEffect(() => {
    if (hourlyData.length === 0) return

    const { earliest, latest } = getDataBoundaries()
    // Reset zoom when new data comes in
    setZoomRange(null)

    // Anchor presets (1D/2D/1W/1M) to the most recent data point (clamped to now).
    // This ensures saved historical datasets still show up immediately on load.
    setPresetAnchorMs(Math.min(Date.now(), latest.getTime()))

    // Default to one month (1M) for initial chart view on both
    // personal and org dashboards, regardless of full data span.
    setTimePeriod('last30d')
    setAggregationMode('day')

    // Pre-fill Custom with full data bounds (but do not force custom mode).
    setCustomStartDate(earliest.toISOString().split('T')[0])
    setCustomEndDate(latest.toISOString().split('T')[0])
    setCustomStartTime('00:00')
    setCustomEndTime('23:59')
    setDateRange({ from: earliest, to: latest })
  }, [hourlyData.length]) // Only re-run when dataset size changes (avoid re-trigger loops)

  const getPresetWindowMs = (period: TimePeriod): number => {
    switch (period) {
      case 'last7d': return 7 * 24 * 60 * 60 * 1000
      case 'last14d': return 14 * 24 * 60 * 60 * 1000
      case 'last30d': return 30 * 24 * 60 * 60 * 1000
      case 'last3m': return 90 * 24 * 60 * 60 * 1000
      default: return 0
    }
  }

  const shiftPresetWindow = (direction: -1 | 1) => {
    if (timePeriod === 'custom') return
    if (hourlyData.length === 0) return
    const { earliest } = getDataBoundaries()
    const windowMs = getPresetWindowMs(timePeriod)
    if (!windowMs) return

    const maxAnchor = Date.now()
    const current = presetAnchorMs ?? maxAnchor
    const next = current + direction * windowMs

    // Clamp anchor to available data range
    const clamped = Math.max(earliest.getTime(), Math.min(maxAnchor, next))
    setPresetAnchorMs(clamped)
  }

  const getActiveWindow = (): { startDate: Date | null; endDate: Date | null } => {
    if (hourlyData.length === 0) return { startDate: null, endDate: null }

    if (timePeriod === 'custom') {
      let startDate: Date | null = null
      let endDate: Date | null = null

      if (customStartDate) {
        if (aggregationMode === 'hour' && customStartTime) {
          startDate = new Date(customStartDate + 'T' + customStartTime + ':00')
        } else {
          startDate = new Date(customStartDate + 'T00:00:00')
        }
      }

      if (customEndDate) {
        if (aggregationMode === 'hour' && customEndTime) {
          endDate = new Date(customEndDate + 'T' + customEndTime + ':59')
        } else {
          endDate = new Date(customEndDate + 'T23:59:59')
        }
      }

      return { startDate, endDate }
    }

    const windowMs = getPresetWindowMs(timePeriod)
    if (!windowMs) return { startDate: null, endDate: null }

    const endMs = presetAnchorMs ?? Date.now()
    const endDate = new Date(endMs)
    const startDate = new Date(endMs - windowMs)
    return { startDate, endDate }
  }

  // Keep parent in sync with the currently active window.
  useEffect(() => {
    if (!onActiveWindowChange) return
    const { startDate, endDate } = getActiveWindow()
    onActiveWindowChange({
      startMs: startDate ? startDate.getTime() : null,
      endMs: endDate ? endDate.getTime() : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onActiveWindowChange,
    timePeriod,
    presetAnchorMs,
    customStartDate,
    customEndDate,
    customStartTime,
    customEndTime,
    aggregationMode,
    hourlyData.length,
  ])

  // Handle date range picker changes with validation
  const handleDateRangeChange = (range: DateRange | undefined) => {
    console.log('Raw date range selected:', range)
    
    if (!range) {
      setDateRange(undefined)
      setCustomStartDate('')
      setCustomEndDate('')
      return
    }

    const { earliest: dataStart, latest: dataEnd } = getDataBoundaries()
    const now = new Date()
    
    // Validate and adjust the range
    let adjustedRange = { ...range }
    
    // If start date is before data starts, that's okay - we'll just start from data start
    // If start date is after data ends, adjust to data end
    if (range.from && range.from > dataEnd) {
      adjustedRange.from = dataEnd
    }
    
    // End date should never be in the future
    if (range.to && range.to > now) {
      adjustedRange.to = now
    }
    
    // If end date is before data starts, adjust to data start
    if (range.to && range.to < dataStart) {
      adjustedRange.to = dataStart
    }
    
    console.log('Adjusted date range:', adjustedRange)
    console.log('Data boundaries:', { dataStart, dataEnd })
    
    setDateRange(adjustedRange)
    
    if (adjustedRange.from) {
      setCustomStartDate(adjustedRange.from.toISOString().split('T')[0])
      setCustomStartTime('00:00')
    } else {
      setCustomStartDate('')
      setCustomStartTime('00:00')
    }
    
    if (adjustedRange.to) {
      setCustomEndDate(adjustedRange.to.toISOString().split('T')[0])
      setCustomEndTime('23:59')
    } else {
      setCustomEndDate(now.toISOString().split('T')[0])
      setCustomEndTime('23:59')
    }
  }

  // Auto-adjust aggregation mode based on time period
  const handleTimePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod)
    
    // Reset zoom when changing time periods to prevent chart disappearing
    setZoomRange(null)
    
    // Auto-select appropriate aggregation mode for presets
    if (newPeriod === 'last7d' || newPeriod === 'last14d') {
      setAggregationMode('hour')
    } else if (newPeriod === 'last30d' || newPeriod === 'last3m') {
      setAggregationMode('day')
    }
    
    // Set default dates for custom range
    if (newPeriod === 'custom') {
      const now = new Date()
      const today = now.toISOString().split('T')[0] // Today's date
      
      // Set end date to today at current time (will be midnight by default)
      setCustomEndDate(today)
      setCustomEndTime('23:59') // End of day
      
      // Leave start date empty for "all time" behavior
      if (!customStartDate) {
        setCustomStartDate('')
        setCustomStartTime('00:00')
      }

      // Set default date range for the picker
      if (!dateRange?.to) {
        setDateRange({
          from: undefined, // Start with no from date for "all time"
          to: now
        })
      }
    }

    // For presets, anchor to now so 1M really means "last 30 days (relative to today)".
    if (newPeriod !== 'custom') {
      setPresetAnchorMs(Date.now())
    }
  }

  // Quick preset functions for common time ranges
  const setQuickRange = (hours: number) => {
    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    setCustomStartDate(start.toISOString().split('T')[0])
    setCustomEndDate(now.toISOString().split('T')[0])
    setCustomStartTime(start.toTimeString().slice(0, 5))
    setCustomEndTime(now.toTimeString().slice(0, 5))
    setTimePeriod('custom')
    setAggregationMode('hour')
  }

  // Generate aggregation key based on mode
  const getAggregationKey = (date: Date, mode: 'day' | 'hour'): string => {
    if (mode === 'day') return date.toISOString().split('T')[0] // YYYY-MM-DD
    const isoString = date.toISOString()
    return isoString.split(':')[0] // YYYY-MM-DDTHH
  }

  // Get display label for aggregation
  const getDisplayLabel = (date: Date, mode: 'day' | 'hour'): string => {
    if (mode === 'day') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dayLabel = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    const hourLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false }).replace(':00', '')
    return `${dayLabel} ${hourLabel}h`
  }

  // Filter data based on selected time period
  const getFilteredData = (): CursorUsage[] => {
    if (hourlyData.length === 0) return []

    const { startDate, endDate } = getActiveWindow()
    const startMs = startDate ? startDate.getTime() : null
    const endMs = endDate ? endDate.getTime() : null

    // Crossfilter-inspired: use the sorted time index to slice quickly
    const lowerBound = (ms: number) => {
      let lo = 0
      let hi = hourlyData.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (hourlyData[mid]!.timestamp < ms) lo = mid + 1
        else hi = mid
      }
      return lo
    }

    const upperBound = (ms: number) => {
      let lo = 0
      let hi = hourlyData.length
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (hourlyData[mid]!.timestamp <= ms) lo = mid + 1
        else hi = mid
      }
      return lo
    }

    const lo = typeof startMs === 'number' ? lowerBound(startMs) : 0
    const hi = typeof endMs === 'number' ? upperBound(endMs) : hourlyData.length
    const filteredData = hourlyData.slice(lo, hi)

    // If no data matches the filter:
    // - For presets (1D/2D/1W/1M): return [] so we can show an explicit "no data in this window" state.
    // - For custom: keep the old fallback behavior to help users recover from out-of-bounds selection.
    if (filteredData.length === 0 && hourlyData.length > 0 && timePeriod === 'custom') {
      console.log('No data in selected range, showing data boundaries instead')
      const { earliest, latest } = getDataBoundaries()
      
      // If the selected range is completely before our data, show earliest data
      if (endDate && endDate < earliest) {
        const end = earliest.getTime() + 24 * 60 * 60 * 1000
        return hourlyData.filter(usage => {
          const ms = (usage as any).timestamp as number
          return ms >= earliest.getTime() && ms <= end
        })
      }
      
      // If the selected range is completely after our data, show latest data
      if (startDate && startDate > latest) {
        const start = latest.getTime() - 24 * 60 * 60 * 1000
        return hourlyData.filter(usage => {
          const ms = (usage as any).timestamp as number
          return ms >= start && ms <= latest.getTime()
        })
      }
    }

    return filteredData
  }

  // Process and aggregate data with zoom filtering
  const processData = (filteredData: CursorUsage[]): ChartData[] => {
    if (filteredData.length === 0) return []

    // Group data by the selected aggregation mode
    const groupedData = filteredData.reduce((acc, usage) => {
      const fullDate = new Date((usage as any).timestamp as number)
      const key = getAggregationKey(fullDate, aggregationMode)
      
      if (!acc[key]) {
        acc[key] = { models: {}, modelInput: {}, modelOutput: {}, sumTokens: 0, sumCost: 0, fullDate }
      }
      const modelName = resolveGroupName(usage)
      if (!modelName) return acc
      const modelKey = modelKeyByName.get(modelName) ?? modelName

      if (!acc[key].models[modelKey]) {
        acc[key].models[modelKey] = 0
        acc[key].modelInput[modelKey] = 0
        acc[key].modelOutput[modelKey] = 0
      }
      
      // For tokens mode, separate input and output tokens
      if (metricMode === 'tokens' && usage.tokenBreakdown) {
        const inputTokens = usage.tokenBreakdown.inputWithCacheWrite + usage.tokenBreakdown.inputWithoutCacheWrite
        const outputTokens = usage.tokenBreakdown.output
        acc[key].modelInput[modelKey] += inputTokens
        acc[key].modelOutput[modelKey] += outputTokens
        acc[key].models[modelKey] += inputTokens + outputTokens
      } else if (metricMode === 'tokens') {
        acc[key].models[modelKey] += usage.tokens
      } else {
        acc[key].models[modelKey] += (usage.costUsd || 0)
      }

      // For derived metrics (e.g. cost per million), track totals once per bucket.
      acc[key].sumTokens += usage.tokens || 0
      acc[key].sumCost += usage.costUsd || 0
      
      return acc
    }, {} as { [key: string]: { models: { [model: string]: number }, modelInput: { [model: string]: number }, modelOutput: { [model: string]: number }, sumTokens: number, sumCost: number, fullDate: Date } })

    // Get date range
    const allDates = filteredData.map(usage => new Date((usage as any).timestamp as number))
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Generate complete time series
    const completeData: ChartData[] = []
    const current = new Date(minDate)
    if (aggregationMode === 'day') {
      current.setHours(0, 0, 0, 0)
    } else {
      current.setMinutes(0, 0, 0)
    }

    // Get all unique models to ensure consistent data structure
    const allModels = modelDefs

    while (current <= maxDate) {
      const key = getAggregationKey(current, aggregationMode)
      const displayLabel = getDisplayLabel(current, aggregationMode)
      
      const chartEntry: ChartData = {
        date: displayLabel,
        fullDate: new Date(current),
      }

      // Initialize all models with 0 (for both input and output)
      allModels.forEach(d => {
        chartEntry[d.key] = 0
        chartEntry[`${d.key}_input`] = 0
        chartEntry[`${d.key}_output`] = 0
      })

      // Fill in actual data if it exists
      if (groupedData[key]) {
        Object.entries(groupedData[key].models).forEach(([modelKey, total]) => {
          chartEntry[modelKey] = total
        })
        Object.entries(groupedData[key].modelInput).forEach(([modelKey, input]) => {
          chartEntry[`${modelKey}_input`] = input
        })
        Object.entries(groupedData[key].modelOutput).forEach(([modelKey, output]) => {
          chartEntry[`${modelKey}_output`] = output
        })
      }

      completeData.push(chartEntry)

      // Increment time period
      if (aggregationMode === 'day') {
        current.setDate(current.getDate() + 1)
      } else if (aggregationMode === 'hour') {
        current.setHours(current.getHours() + 1)
      }
    }

    // Apply zoom filtering if zoom range exists
    if (zoomRange) {
      return completeData.slice(zoomRange.start, zoomRange.end + 1)
    }

    return completeData
  }

  // Get all unique models from the dataset (stable ordering).
  const allModels = useMemo(
    () => Array.from(new Set(hourlyData.map((usage) => resolveGroupName(usage)))).filter(Boolean).sort(),
    [hourlyData, resolveGroupName]
  )

  // Recharts treats `dataKey` as a path (dots are separators), so model names like "claude-3.5"
  // can break rendering. Use safe, deterministic keys and map back to display names.
  type ModelDef = {
    name: string
    displayName: string
    key: string
    baseColor: string
    inputColor: string
    outputColor: string
  }

  const hashString32 = (s: string) => {
    // djb2
    let h = 5381
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
    return h >>> 0
  }

  const modelDefs: ModelDef[] = useMemo(() => {
    const used = new Set<string>()
    const out: ModelDef[] = []
    const colorIndexByName = new Map<string, number>()
    const usedColorIndexes = new Set<number>()
    const paletteSize = CORE_MODEL_COLORS.length
    // Use a coprime step to spread assignments across the palette.
    const paletteStep = 7

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 }
    }

    for (const name of allModels) {
      const start = hashString32(name) % paletteSize
      let chosen = start
      for (let attempt = 0; attempt < paletteSize; attempt++) {
        const candidate = (start + attempt * paletteStep) % paletteSize
        if (!usedColorIndexes.has(candidate)) {
          chosen = candidate
          usedColorIndexes.add(candidate)
          break
        }
      }
      colorIndexByName.set(name, chosen)
    }

    for (const name of allModels) {
      const baseColor = CORE_MODEL_COLORS[colorIndexByName.get(name) ?? 0]!
      const rgb = hexToRgb(baseColor)
      const inputColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`
      const outputColor = `rgba(${Math.min(rgb.r + 50, 255)}, ${Math.min(rgb.g + 50, 255)}, ${Math.min(rgb.b + 50, 255)}, 0.7)`
      const displayName = groupByMode === 'source' ? toFriendlySourceLabel(name) : name

      // Deterministic, safe key
      let key = `m_${hashString32(name).toString(36)}`
      while (used.has(key)) key = `${key}_x`
      used.add(key)

      out.push({ name, displayName, key, baseColor, inputColor, outputColor })
    }

    return out
  }, [allModels, groupByMode])

  const modelKeyByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of modelDefs) m.set(d.name, d.key)
    return m
  }, [modelDefs])

  const modelNameByKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of modelDefs) m.set(d.key, d.displayName)
    return m
  }, [modelDefs])

  const modelBaseColorByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of modelDefs) m.set(d.name, d.baseColor)
    return m
  }, [modelDefs])

  // PERF: these computations can be expensive for large datasets, so memoize them.
  // This keeps row-click UI updates snappy by avoiding re-aggregating on selection changes.
  const filteredData = useMemo(
    () => getFilteredData(),
    [
      hourlyData,
      timePeriod,
      presetAnchorMs,
      customStartDate,
      customEndDate,
      customStartTime,
      customEndTime,
      aggregationMode,
    ]
  )

  const chartData = useMemo(
    () => processData(filteredData),
    [filteredData, aggregationMode, metricMode, modelKeyByName, modelDefs, zoomRange, resolveGroupName]
  )

  const hasDataInWindow = chartData.length > 0

  const chartDataByLabel = useMemo(() => {
    const m = new Map<string, ChartData>()
    for (const d of chartData) m.set(d.date, d)
    return m
  }, [chartData])

  // Raw event details (top-K) for the current window (details on demand).
  const filteredTotals = useMemo(() => {
    let tokens = 0
    let costUsd = 0
    const models = new Set<string>()

    for (const u of filteredData) {
      tokens += u.tokens || 0
      costUsd += u.costUsd || 0
      if (u.model) models.add(u.model)
    }

    return { tokens, costUsd, modelsUsed: models.size }
  }, [filteredData])

  const activeBucketCount = useMemo(() => {
    if (chartData.length === 0) return 0
    return chartData.filter((d) => {
      for (const m of modelDefs) {
        if (metricMode === 'tokens') {
          if (((d[`${m.key}_input`] as number) ?? 0) > 0) return true
          if (((d[`${m.key}_output`] as number) ?? 0) > 0) return true
        } else {
          if (((d[m.key] as number) ?? 0) > 0) return true
        }
      }
      return false
    }).length
  }, [chartData, modelDefs, metricMode])

  const activeWindowLabel = useMemo(() => {
    const { startDate, endDate } = getActiveWindow()
    if (!startDate || !endDate) return ''
    const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    return `${startDate.toLocaleDateString('en-US', fmt)} → ${endDate.toLocaleDateString('en-US', fmt)}`
  }, [
    timePeriod,
    presetAnchorMs,
    customStartDate,
    customEndDate,
    customStartTime,
    customEndTime,
    aggregationMode,
    hourlyData.length,
  ])

  // Dynamic X-axis label density as data grows
  const xAxisConfig = useMemo(() => {
    const points = chartData.length
    // Target a reasonable number of visible labels per aggregation level
    const targetTicks =
      aggregationMode === 'day' ? 14 :
      24

    const step = points > targetTicks ? Math.ceil(points / targetTicks) : 1
    const interval = Math.max(0, step - 1) // Recharts: 0=every tick, 1=every other, etc.

    // If we’re skipping lots of labels, don’t rotate them (cleaner).
    const rotate = step <= 2

    return {
      interval,
      angle: rotate ? -45 : 0,
      height: rotate ? 80 : 32,
      tickFontSize:
        aggregationMode === 'hour' ? 10 : 12,
      minTickGap: rotate ? 6 : 18,
    }
  }, [aggregationMode, chartData.length])

  type ModelBreakdownRow = {
    model: string
    modelIndex: number
    expandedModelTokenRows: Array<{ model: string; tokens: number }>
    inputTokens: number
    inputWithCacheWriteTokens: number
    inputWithoutCacheWriteTokens: number
    cacheReadTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    costUserCurrency: number
    costPerMillionInputTokensUsd: number
    costPerMillionOutputTokensUsd: number
  }

  const toggleModelBreakdownSort = (key: ModelBreakdownSortKey) => {
    if (key === modelBreakdownSortKey) {
      setModelBreakdownSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setModelBreakdownSortKey(key)
    setModelBreakdownSortDir(key === 'model' ? 'asc' : 'desc')
  }

  const modelBreakdownRows: ModelBreakdownRow[] = useMemo(() => {
    const byModel = new Map<string, Omit<ModelBreakdownRow, 'costPerMillionInputTokensUsd' | 'costPerMillionOutputTokensUsd' | 'costUserCurrency'>>()

    for (const usage of filteredData) {
      const model = resolveGroupName(usage)
      if (!model) continue

      const prev = byModel.get(model) ?? {
        model,
        modelIndex: allModels.indexOf(model),
        expandedModelTokenRows: [],
        inputTokens: 0,
        inputWithCacheWriteTokens: 0,
        inputWithoutCacheWriteTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      }

      const expandedTotals = new Map<string, number>(
        prev.expandedModelTokenRows.map((r) => [r.model, r.tokens])
      )
      const rawExpandedTotals = (usage.raw as any)?.expandedModelTokenTotals
      if (rawExpandedTotals && typeof rawExpandedTotals === 'object') {
        for (const [expandedModel, tokenValue] of Object.entries(rawExpandedTotals as Record<string, unknown>)) {
          const name = String(expandedModel || '').trim()
          if (!name) continue
          const amount = Number(tokenValue) || 0
          if (amount <= 0) continue
          expandedTotals.set(name, (expandedTotals.get(name) || 0) + amount)
        }
      } else {
        const fallbackExpanded = String(usage.expandedModelName || model).trim()
        if (fallbackExpanded) {
          expandedTotals.set(fallbackExpanded, (expandedTotals.get(fallbackExpanded) || 0) + (usage.tokens || 0))
        }
      }
      prev.expandedModelTokenRows = Array.from(expandedTotals.entries())
        .map(([name, tokens]) => ({ model: name, tokens }))
        .sort((a, b) => b.tokens - a.tokens || a.model.localeCompare(b.model))

      prev.totalTokens += usage.tokens || 0
      prev.costUsd += usage.costUsd || 0

      if (usage.tokenBreakdown) {
        const inputWithCacheWrite = usage.tokenBreakdown.inputWithCacheWrite || 0
        const inputWithoutCacheWrite = usage.tokenBreakdown.inputWithoutCacheWrite || 0
        const output = usage.tokenBreakdown.output || 0
        const cacheRead = usage.tokenBreakdown.cacheRead || 0

        prev.inputWithCacheWriteTokens += inputWithCacheWrite
        prev.inputWithoutCacheWriteTokens += inputWithoutCacheWrite
        prev.cacheReadTokens += cacheRead
        prev.outputTokens += output
        prev.inputTokens += inputWithCacheWrite + inputWithoutCacheWrite
      }

      byModel.set(model, prev)
    }

    const rows: ModelBreakdownRow[] = []
    for (const r of byModel.values()) {
      // Cost per 1M tokens:
      // - Input: total USD cost ÷ (input tokens in millions)
      // - Output: total USD cost ÷ (output tokens in millions)
      // Cache read tokens are never part of the denominator.
      const costPerMillionInputTokensUsd = r.inputTokens > 0 ? (r.costUsd / r.inputTokens) * 1_000_000 : 0
      const costPerMillionOutputTokensUsd = r.outputTokens > 0 ? (r.costUsd / r.outputTokens) * 1_000_000 : 0
      rows.push({
        ...r,
        modelIndex: r.modelIndex >= 0 ? r.modelIndex : 0,
        costUserCurrency: convertFromUSD(r.costUsd),
        costPerMillionInputTokensUsd,
        costPerMillionOutputTokensUsd,
      })
    }

    return rows
  }, [filteredData, allModels, convertFromUSD, resolveGroupName])

  const sortedModelBreakdownRows = useMemo(() => {
    const dir = modelBreakdownSortDir === 'asc' ? 1 : -1
    const copy = [...modelBreakdownRows]

    copy.sort((a, b) => {
      if (modelBreakdownSortKey === 'model') {
        const cmp = a.model.localeCompare(b.model)
        if (cmp !== 0) return dir * cmp
        return 0
      }

      const va = a[modelBreakdownSortKey] ?? 0
      const vb = b[modelBreakdownSortKey] ?? 0
      if (va !== vb) return dir * (va - vb)
      return a.model.localeCompare(b.model)
    })

    return copy
  }, [modelBreakdownRows, modelBreakdownSortDir, modelBreakdownSortKey])

  const compareModelOptions = useMemo(() => {
    // Match the dropdown ordering to the current table ordering (post-sort),
    // so the list feels consistent with what the user is looking at.
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const r of sortedModelBreakdownRows) {
      const m = r.model
      if (!m || seen.has(m)) continue
      seen.add(m)
      ordered.push(m)
    }
    return ordered
  }, [sortedModelBreakdownRows])

  useEffect(() => {
    // Default is "no reference model". If the selected model disappears due to filtering,
    // clear it rather than auto-selecting a new one.
    if (referenceModel && !compareModelOptions.includes(referenceModel)) {
      setReferenceModel(null)
    }
  }, [compareModelOptions, referenceModel])

  useEffect(() => {
    if (selectedModel && !allModels.includes(selectedModel)) {
      setSelectedModel(null)
      setSelectedModelForChart(null)
    }
  }, [allModels, selectedModel])

  const referenceCostPerMillionInputUsd = useMemo(() => {
    if (!referenceModel) return null
    const refRow = modelBreakdownRows.find((r) => r.model === referenceModel)
    const v = refRow?.costPerMillionInputTokensUsd ?? 0
    return v > 0 ? v : null
  }, [modelBreakdownRows, referenceModel])

  const referenceCostPerMillionOutputUsd = useMemo(() => {
    if (!referenceModel) return null
    const refRow = modelBreakdownRows.find((r) => r.model === referenceModel)
    const v = refRow?.costPerMillionOutputTokensUsd ?? 0
    return v > 0 ? v : null
  }, [modelBreakdownRows, referenceModel])
  
  // Note: previously used to show a fallback warning under the title; no longer needed.
  
  const getModelBaseColor = (modelName: string) =>
    modelBaseColorByName.get(modelName) ??
    CORE_MODEL_COLORS[hashString32(modelName) % CORE_MODEL_COLORS.length]!

  // Custom tooltip
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

  const formatTokenTick = (value: number) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return ''
    const sign = n < 0 ? '-' : ''
    const abs = Math.abs(n)

    const stripTrailingZero = (s: string) => s.replace(/\.0$/, '')

    if (abs >= 1_000_000_000) {
      const v = abs / 1_000_000_000
      const decimals = v >= 10 ? 0 : 1
      return `${sign}${stripTrailingZero(v.toFixed(decimals))}B`
    }
    if (abs >= 1_000_000) {
      const v = abs / 1_000_000
      const decimals = v >= 10 ? 0 : 1
      return `${sign}${stripTrailingZero(v.toFixed(decimals))}M`
    }
    if (abs >= 1_000) {
      const v = abs / 1_000
      const decimals = v >= 10 ? 0 : 1
      return `${sign}${stripTrailingZero(v.toFixed(decimals))}K`
    }
    return `${sign}${Math.round(abs).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }

  const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    if (active && payload && payload.length) {
      const body = typeof document !== 'undefined' ? document.body : null
      const rect = chartRef.current?.getBoundingClientRect()
      if (!body || !rect || typeof coordinate?.x !== 'number' || typeof coordinate?.y !== 'number') return null

      // Find the corresponding chart data to get the full date
      const dataPoint = chartDataByLabel.get(label)
      const barPayload = payload
      
      const unit = metricMode === 'tokens' ? 'tokens' : 'USD'
      const formatValue = (value: number) => {
        if (metricMode === 'tokens') {
          return Math.round(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
        }
        return `$${value.toFixed(2)}`
      }
      
      // Group by model for tokens mode to show input/output together
      if (metricMode === 'tokens') {
        const modelGroups: { [key: string]: { input: number, output: number, inputColor: string, outputColor: string } } = {}
        barPayload.forEach((entry: any) => {
          const isInput = entry.dataKey.endsWith('_input')
          const isOutput = entry.dataKey.endsWith('_output')
          if (isInput) {
            const modelKey = entry.dataKey.replace('_input', '')
            if (!modelGroups[modelKey]) modelGroups[modelKey] = { input: 0, output: 0, inputColor: '', outputColor: '' }
            modelGroups[modelKey].input = entry.value
            modelGroups[modelKey].inputColor = entry.color
          } else if (isOutput) {
            const modelKey = entry.dataKey.replace('_output', '')
            if (!modelGroups[modelKey]) modelGroups[modelKey] = { input: 0, output: 0, inputColor: '', outputColor: '' }
            modelGroups[modelKey].output = entry.value
            modelGroups[modelKey].outputColor = entry.color
          }
        })
        
        const totalTokens = Object.values(modelGroups).reduce((sum, g) => sum + g.input + g.output, 0)

        const groupCount = Object.keys(modelGroups).filter((k) => {
          const g = modelGroups[k]
          return (g?.input ?? 0) > 0 || (g?.output ?? 0) > 0
        }).length

        // Cursor-following tooltip with edge clamping; bias "above" and push higher to avoid covering bars.
        const estimatedHeightPx = Math.min(620, 132 + groupCount * 34)
        const margin = 18
        const cursorX = rect.left + coordinate.x
        const cursorY = rect.top + coordinate.y
        const spaceAbove = cursorY
        const spaceBelow = window.innerHeight - cursorY
        const placement: 'above' | 'below' =
          spaceAbove >= estimatedHeightPx + margin ? 'above'
            : spaceBelow >= estimatedHeightPx + margin ? 'below'
              : spaceAbove >= spaceBelow ? 'above' : 'below'

        const assumedWidth = Math.min(430, window.innerWidth - 24)
        const left = clamp(cursorX, assumedWidth / 2 + 12, window.innerWidth - assumedWidth / 2 - 12)
        const top = cursorY

        return createPortal((
          <div
            className="rounded-lg shadow-xl w-[430px] max-w-[calc(100vw-24px)] border border-gray-200 overflow-hidden"
            style={{
              position: 'fixed',
              left,
              top,
              transform:
                placement === 'below'
                  ? 'translate(-50%, 18px)'
                  : 'translate(-50%, calc(-100% - 28px))',
              zIndex: 2147483647,
              pointerEvents: 'none',
            }}
          >
            {/* Title bar */}
            <div className="bg-secondary-900 text-white px-3 py-2">
              <div className="font-semibold text-sm">
                {dataPoint?.fullDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  ...(aggregationMode === 'hour' && { hour: 'numeric', hour12: true }),
                })}
              </div>
            </div>

            {/* Body */}
            <div className="bg-white text-gray-900 px-3 py-2">
              <div className="max-h-[52vh] overflow-y-auto pr-1">
                {Object.entries(modelGroups)
                  .filter(([_, data]) => data.input > 0 || data.output > 0)
                  .map(([modelKey, data]) => {
                    const modelName = modelNameByKey.get(modelKey) ?? modelKey
                    return (
                      <div key={modelKey} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{modelName}</p>
                        <div className="pl-2 space-y-0.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.inputColor }}></span>
                              <span className="text-gray-600">Input:</span>
                            </span>
                            <span className="font-semibold text-gray-900">{formatValue(data.input)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.outputColor }}></span>
                              <span className="text-gray-600">Output:</span>
                            </span>
                            <span className="font-semibold text-gray-900">{formatValue(data.output)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-0.5">
                            <span className="text-gray-500">Subtotal:</span>
                            <span className="font-bold text-gray-900">{formatValue(data.input + data.output)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {totalTokens > 0 && (
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <p className="text-sm font-bold text-gray-900 flex justify-between">
                    <span>Total:</span>
                    <span>{formatValue(totalTokens)} tokens</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        ), body)
      }
      
      // Original tooltip for costs mode
      const totalValue = barPayload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      // Cursor-following tooltip (costs mode)
      const estimatedHeightPx = Math.min(520, 132 + barPayload.filter((e: any) => (e?.value ?? 0) > 0).length * 22)
      const margin = 18
      const cursorX = rect.left + coordinate.x
      const cursorY = rect.top + coordinate.y
      const spaceAbove = cursorY
      const spaceBelow = window.innerHeight - cursorY
      const placement: 'above' | 'below' =
        spaceAbove >= estimatedHeightPx + margin ? 'above'
          : spaceBelow >= estimatedHeightPx + margin ? 'below'
            : spaceAbove >= spaceBelow ? 'above' : 'below'

      const assumedWidth = Math.min(430, window.innerWidth - 24)
      const left = clamp(cursorX, assumedWidth / 2 + 12, window.innerWidth - assumedWidth / 2 - 12)
      const top = cursorY

      return createPortal((
        <div
          className="rounded-lg shadow-xl w-[430px] max-w-[calc(100vw-24px)] border border-gray-200 overflow-hidden"
          style={{
            position: 'fixed',
            left,
            top,
            transform:
              placement === 'below'
                ? 'translate(-50%, 18px)'
                : 'translate(-50%, calc(-100% - 28px))',
            zIndex: 2147483647,
            pointerEvents: 'none',
          }}
        >
          {/* Title bar */}
          <div className="bg-secondary-900 text-white px-3 py-2">
            <div className="font-semibold text-sm">
              {dataPoint?.fullDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                ...(aggregationMode === 'hour' && { hour: 'numeric', hour12: true }),
              })}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white text-gray-900 px-3 py-2">
            <div className="max-h-[52vh] overflow-y-auto pr-1">
              {barPayload
                .filter((entry: any) => entry.value > 0)
                .map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs py-0.5">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-gray-700 whitespace-nowrap">
                        {entry.name ?? (modelNameByKey.get(String(entry.dataKey)) ?? entry.dataKey)}
                      </span>
                    </span>
                    <span className="font-semibold text-gray-900 tabular-nums ml-3 whitespace-nowrap shrink-0">
                      {formatValue(entry.value)} {unit}
                    </span>
                  </div>
                ))}
            </div>

            {totalValue > 0 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <p className="text-xs font-semibold text-gray-900 flex items-center justify-between whitespace-nowrap">
                  <span>Total:</span>
                  <span>{formatValue(totalValue)} {unit}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      ), body)
    }
    return null
  }

  // Replace brush change handler with drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!chartRef.current) return
    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setDragStart(x)
    setDragEnd(x)
    // Don't set isDragging immediately - wait for actual movement
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragStart === null || !chartRef.current) return
    
    const rect = chartRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Only start dragging if we've moved more than 5 pixels (prevents accidental drags)
    if (!isDragging && Math.abs(x - dragStart) > 5) {
      setIsDragging(true)
    }
    
    if (isDragging || Math.abs(x - dragStart) > 5) {
      setDragEnd(x)
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    if (dragStart === null || dragEnd === null || !chartRef.current) {
      setDragStart(null)
      setDragEnd(null)
      setIsDragging(false)
      return
    }
    
    // Only process zoom if we actually dragged (not just clicked)
    if (isDragging) {
      const rect = chartRef.current.getBoundingClientRect()
      const chartWidth = rect.width - 80 // Account for margins
      const startPercent = Math.min(dragStart, dragEnd) / chartWidth
      const endPercent = Math.max(dragStart, dragEnd) / chartWidth
      
      // Only zoom if selection is meaningful (more than 5% of chart width)
      if (Math.abs(endPercent - startPercent) > 0.05) {
        const currentDataLength = chartData.length
        const newStartIndex = Math.floor(startPercent * currentDataLength)
        const newEndIndex = Math.ceil(endPercent * currentDataLength)
        
        if (zoomRange) {
          // If already zoomed, calculate the new range relative to the original data
          const originalRange = zoomRange.end - zoomRange.start + 1
          const absoluteStartIndex = zoomRange.start + Math.floor((newStartIndex / currentDataLength) * originalRange)
          const absoluteEndIndex = zoomRange.start + Math.ceil((newEndIndex / currentDataLength) * originalRange)
          setZoomRange({ 
            start: absoluteStartIndex, 
            end: Math.min(absoluteEndIndex, zoomRange.end) 
          })
        } else {
          // First zoom - use the indices directly
          setZoomRange({ 
            start: newStartIndex, 
            end: Math.min(newEndIndex, currentDataLength - 1) 
          })
        }
      }
    }
    
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, chartData.length, zoomRange])

  // Add reset zoom function
  const resetZoom = () => {
    setZoomRange(null)
  }

  // Keep the UI visible even if there's no data in the selected window.
  // (Avoids confusing "snapping" back to old data and makes it obvious the window is empty.)

  return (
    <>
      {/* Global style to ensure Recharts tooltips appear on top */}
      <style>{`
        .recharts-tooltip-wrapper {
          z-index: 10000 !important;
          position: absolute !important;
        }
      `}</style>
      
      <div ref={entireChartRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 relative transition-colors duration-200">
        {/* Top Bar - AI Coder Guru Dark Blue (hidden in UI, shown in copy) */}
        <div className="top-bar bg-secondary-900 py-3 -mx-6 -mt-6 mb-4 hidden" style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}></div>
      
      <div className={cn("flex items-start justify-between", activeWindowLabel ? "mb-8" : "mb-4")}>
        {/* Left section for title */}
        <div className="flex-grow mr-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {aggregationMode === 'day' ? 'Daily' : 'Hourly'} tokens by {groupByMode === 'model' ? 'model' : groupByMode === 'expandedModel' ? 'expanded model' : 'source'}
          </h3>
        </div>

        {/* Right section for controls and copy button - responsive layout */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full md:w-auto md:flex-nowrap [@media(max-width:719px)]:flex-col [@media(max-width:719px)]:items-stretch">
          {/* Time Period Selector */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftPresetWindow(-1)}
                disabled={timePeriod === 'custom'}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors border",
                  timePeriod === 'custom'
                    ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-600 text-gray-400"
                    : "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600"
                )}
                title="Previous window"
              >
                ‹
              </button>
              <TimeRangeSegmentedControl<PresetTimePeriod>
                value={timePeriod === 'custom' ? null : timePeriod}
                onChange={(v) => handleTimePeriodChange(v)}
                options={[
                  { value: 'last7d', label: '1W' },
                  { value: 'last14d', label: '2W' },
                  { value: 'last30d', label: '1M' },
                  { value: 'last3m', label: '3M' },
                ]}
                className="mx-1"
              />

              <button
                onClick={() => handleTimePeriodChange('custom')}
                className={cn(
                  "ml-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                  timePeriod === 'custom'
                    ? "bg-secondary-900 text-white border-secondary-900"
                    : "bg-gray-100 dark:bg-gray-700 text-secondary-900 dark:text-white/90 border-gray-200 dark:border-gray-600 hover:bg-gray-200/60 dark:hover:bg-gray-600"
                )}
                title="Custom Date Range"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => shiftPresetWindow(1)}
                disabled={timePeriod === 'custom'}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors border",
                  timePeriod === 'custom'
                    ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-600 text-gray-400"
                    : "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600"
                )}
                title="Next window"
              >
                ›
              </button>
            </div>
            {activeWindowLabel && (
              <div className="absolute left-0 top-full mt-1 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                <span className="font-medium">Showing:</span> {activeWindowLabel}
              </div>
            )}
          </div>
          {/* Metric Toggle */}
          <div className="flex h-9 items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-0.5 transition-colors duration-200 mb-1 md:mb-0 max-w-[140px] shadow-sm">
            <button
              onClick={() => setMetricMode('tokens')}
              className={cn(
                "inline-flex h-8 items-center justify-center px-3 text-sm font-medium rounded transition-colors",
                metricMode === 'tokens'
                  ? 'bg-secondary-900 text-white shadow-sm'
                  : 'text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600'
              )}
            >
              Tokens
            </button>
            <button
              onClick={() => setMetricMode('costs')}
              className={cn(
                "inline-flex h-8 items-center justify-center px-3 text-sm font-medium rounded transition-colors",
                metricMode === 'costs'
                  ? 'bg-secondary-900 text-white shadow-sm'
                  : 'text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600'
              )}
            >
              Costs
            </button>
          </div>

          <div className="flex items-center rounded-lg p-0.5 transition-colors duration-200 mb-1 md:mb-0">
            {/* Aggregation Toggle + Copy Button (responsive group) */}
            <div
              className="
                flex h-9 items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-0.5 transition-colors duration-200 mb-1 shadow-sm
                md:w-auto
                flex-row
                gap-2
                [@media(max-width:719px)]:mt-1
              "
            >
              <div className="flex items-center flex-1 min-w-0 max-w-[150px]">
                <button
                  onClick={() => setAggregationMode('day')}
                  className={cn(
                    "inline-flex h-8 items-center justify-center px-3 text-sm font-medium rounded transition-colors",
                    aggregationMode === 'day'
                      ? 'bg-secondary-900 text-white shadow-sm'
                      : 'text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600'
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setAggregationMode('hour')}
                  className={cn(
                    "inline-flex h-8 items-center justify-center px-3 text-sm font-medium rounded transition-colors",
                    aggregationMode === 'hour'
                      ? 'bg-secondary-900 text-white shadow-sm'
                      : 'text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600'
                  )}
                >
                  Hourly
                </button>
              </div>
            </div>

            

            {/* Copy Chart Button */}
            <button
              onClick={handleCopyChart}
              className="inline-flex h-9 items-center bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-secondary-900 dark:text-white/90 px-3 rounded-xl hover:bg-secondary-900 hover:text-white hover:border-secondary-900 transition-all duration-200 shadow-sm hover:shadow-md ml-2"
              title="Copy chart as image"
            >
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Copy</span>
              </div>
            </button>

          </div>


        </div>
      </div>

     
      {copiedMessage && (
        <div className="absolute top-2 right-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-md text-xs shadow-lg z-[150]">
          {copiedMessage}
        </div>
      )}

      {/* Reset Zoom Button - Separate Row if needed, or could be combined */}
      {zoomRange && (
        <div className="flex justify-end mb-2">
          <button
            onClick={resetZoom}
            className="px-2.5 py-1 text-xs bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100 transition-colors border border-orange-200"
          >
            Reset Zoom
          </button>
        </div>
      )}

      {/* Custom Date Range - ensure it doesn't cause overflow, or hide on small screens */}
      {timePeriod === 'custom' && (
        <div className="flex justify-end gap-2 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Date Range:</span>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="Select date range"
                className="w-60 text-xs" // Reduced width and text size
              />
              {aggregationMode === 'hour' && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Quick:</span>
                  <button onClick={() => setQuickRange(6)} className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">6h</button>
                  <button onClick={() => setQuickRange(12)} className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">12h</button>
                  <button onClick={() => setQuickRange(24)} className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">24h</button>
                </div>
              )}
            </div>
        </div>
      )}


      {/* Chart */}
      <div className="h-96 w-full" ref={chartRef}>
        {!hasDataInWindow && (
          <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-900/20 transition-all duration-300">
            <div className="text-center px-6 animate-[fadeIn_0.3s_ease-in-out]">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                <BarChart3 className="w-7 h-7 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                No data in this window
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Your data may be outside the selected time range. Use ‹ to page back, or switch to Custom.
              </div>
            </div>
          </div>
        )}
        {/* Chart container with event handling */}
        <div 
          className={cn("relative h-full", !hasDataInWindow && "hidden")}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => {
            // If a model is highlighted, clicking the chart clears it.
            // (Avoids hover-driven updates and gives users an easy "click off" behavior.)
            if (!isDragging && selectedModel) clearSelectedModel()
          }}
          onMouseLeave={() => {
            if (isDragging) {
              setIsDragging(false)
              setDragStart(null)
              setDragEnd(null)
            }
          }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20, // Back to normal margin
              }}
            >
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: xAxisConfig.tickFontSize, fill: '#6b7280' }}
                angle={xAxisConfig.angle}
                textAnchor="end"
                height={xAxisConfig.height}
                stroke="#9ca3af"
                interval={xAxisConfig.interval}
                minTickGap={xAxisConfig.minTickGap}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#9ca3af"
                tickFormatter={metricMode === 'tokens' ? (v) => formatTokenTick(Number(v)) : undefined}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 100000, pointerEvents: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              
              {/* Create stacked bars for each model - Input (bottom) and Output (top) */}
              {metricMode === 'tokens' ? (
                modelDefs.map((d, i) => {
                  const isDimmed = selectedModelForChart !== null && selectedModelForChart !== d.name
                  return (
                    <React.Fragment key={d.key}>
                      {/* Input tokens bar (bottom of stack) */}
                      <Bar
                        yAxisId="left"
                        dataKey={`${d.key}_input`}
                        stackId="usage"
                        fill={d.inputColor}
                        name={`${d.displayName} (Input)`}
                        opacity={isDimmed ? 0.3 : 1}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationBegin={i * 50}
                        animationEasing="ease-out"
                        style={{
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      />
                      {/* Output tokens bar (top of stack) */}
                      <Bar
                        yAxisId="left"
                        dataKey={`${d.key}_output`}
                        stackId="usage"
                        fill={d.outputColor}
                        name={`${d.displayName} (Output)`}
                        opacity={isDimmed ? 0.3 : 1}
                        isAnimationActive={true}
                        animationDuration={600}
                        animationBegin={i * 50}
                        animationEasing="ease-out"
                        style={{
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      />
                    </React.Fragment>
                  )
                })
              ) : (
                // For costs mode, use single bars
                modelDefs.map((d, i) => {
                  const isDimmed = selectedModelForChart !== null && selectedModelForChart !== d.name
                  
                  return (
                    <Bar
                      key={d.key}
                      yAxisId="left"
                      dataKey={d.key}
                      stackId="usage"
                      fill={d.baseColor}
                      name={d.displayName}
                      opacity={isDimmed ? 0.3 : 0.8}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationBegin={i * 50}
                      animationEasing="ease-out"
                      style={{
                        transition: 'opacity 0.2s ease-in-out'
                      }}
                    />
                  )
                })
              )}
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Drag selection overlay - only visible when dragging */}
          {isDragging && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute top-0 border-l-2 border-r-2 border-teal-600 pointer-events-none"
              style={{
                left: Math.min(dragStart, dragEnd),
                width: Math.abs(dragEnd - dragStart),
                height: '100%',
                backgroundColor: 'rgba(13, 148, 136, 0.08)', // Very transparent midnight green
              }}
            />
          )}
        </div>
      </div>

      {/* Chart Footer */}
      <div className="-mt-10 pt-6">
        {/* Last Data Point Recorded & Cost Difference */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-300 transition-colors duration-200">
            <span className="font-medium">Last data point recorded:</span>{' '}
            {(() => {
              if (filteredData.length === 0) return 'No data available'
              
              // Data is sorted ascending; the last row is the most recent.
              const latestDataPoint = filteredData[filteredData.length - 1]!
              const latestMs =
                typeof (latestDataPoint as any).timestamp === 'number'
                  ? (latestDataPoint as any).timestamp
                  : Date.parse(latestDataPoint.date)
              const latestDate = new Date(latestMs)
              return latestDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            })()}
          </div>
          
          {/* Dynamic Legend for Stacked Bars (shown on model hover) - positioned on same row */}
          <div className="flex items-center gap-4">
            {/* Reserve vertical space so toggling highlight doesn't shift layout */}
            {metricMode === 'tokens' && (
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1 h-7 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded transition-opacity",
                  selectedModel ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={!selectedModel}
              >
                {selectedModel ? (
                  <>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {displayGroupName(selectedModel)}:
                    </span>
                    {(() => {
                      const baseColor = getModelBaseColor(selectedModel)
                      const hexToRgb = (hex: string) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
                        return result ? {
                          r: parseInt(result[1], 16),
                          g: parseInt(result[2], 16),
                          b: parseInt(result[3], 16)
                        } : { r: 0, g: 0, b: 0 }
                      }
                      const rgb = hexToRgb(baseColor)
                      const inputColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`
                      const outputColor = `rgba(${Math.min(rgb.r + 50, 255)}, ${Math.min(rgb.g + 50, 255)}, ${Math.min(rgb.b + 50, 255)}, 0.7)`
                      
                      return (
                        <>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: inputColor }}></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Input</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: outputColor }}></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Output</span>
                          </div>
                        </>
                      )
                    })()}
                  </>
                ) : (
                  // Keep height stable even when hidden
                  <span className="text-xs">&nbsp;</span>
                )}
              </div>
            )}
            
            {typeof costDifference === 'number' && lastPastedDataCost !== undefined && lastPastedDataCost !== 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-300 transition-colors duration-200">
                <span className="font-medium">Change since last paste:</span>{' '}
                <span className={costDifference >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {costDifference >= 0 ? '+' : ''}{formatCurrency(convertFromUSD(costDifference), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Legend */}
        {/* <div className="flex gap-3 max-w-full flex-wrap mb-4">
          {allModels
            .filter(model => chartData.some(dataPoint => (dataPoint[model] as number || 0) > 0))
            .map((model, _) => {
              const originalIndex = allModels.indexOf(model)
              // Sum the series according to the active metric
              const seriesTotal = chartData.reduce((sum, dataPoint) => {
                const value = (dataPoint[model] as number) || 0
                return sum + value
              }, 0)

              const formatted =
                metricMode === 'tokens'
                  ? `${seriesTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} tokens`
                  : formatCurrency(convertFromUSD(seriesTotal), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

              return (
                <div key={model} className="flex items-center space-x-2">
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getModelBaseColor(model) }}
                  ></span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200">
                    {model} <span className="text-gray-500 dark:text-gray-400">({formatted})</span>
                  </span>
                </div>
              )
            })}
        </div> */}
        
        
        {/* Tabular Legend - Model Breakdown Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 transition-colors duration-200">
          <div className="flex items-center justify-between mb-3 min-h-[28px]">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Breakdown by {groupByMode === 'model' ? 'Model' : groupByMode === 'expandedModel' ? 'Expanded model' : 'Source'} ({timePeriod === 'custom' ? 'Custom Range' : timePeriod})
            </h4>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Group by:</span>
                <select
                  value={groupByMode}
                  onChange={(e) => setGroupByMode(e.target.value as GroupByMode)}
                  className="h-7 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  title="Choose how chart and table are grouped"
                >
                  <option value="model">Model</option>
                  <option value="expandedModel">Expanded model</option>
                  <option value="source">Source</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Price compare to:</span>
                <select
                  value={referenceModel ?? ''}
                  onChange={(e) => setReferenceModel(e.target.value || null)}
                  className="h-7 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  title="Select a reference model to compare input cost efficiency"
                >
                  <option value="">None</option>
                  {compareModelOptions.map((m) => (
                    <option key={m} value={m}>
                      {displayGroupName(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear highlight */}
              <button
                type="button"
                onClick={clearSelectedModel}
                disabled={!selectedModel}
                className={cn(
                  'h-7 inline-flex items-center justify-center px-2 text-xs rounded-md border transition-colors',
                  selectedModel
                    ? 'bg-secondary-900 text-white border-secondary-900 hover:bg-secondary-800'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                )}
                title="Clear highlighted model"
              >
                Clear highlight
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm leading-5">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">#</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Color</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('model')}
                      className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by model"
                    >
                      <span>{groupByMode === 'source' ? 'Source' : groupByMode === 'expandedModel' ? 'Expanded Model' : 'Model'}</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'model' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('inputWithoutCacheWriteTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by input tokens (non-cache)"
                    >
                      <span>Input Tokens</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'inputWithoutCacheWriteTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('inputWithCacheWriteTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by cache write tokens"
                    >
                      <span>Cache Write</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'inputWithCacheWriteTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('inputTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by total input tokens (input + cache write)"
                    >
                      <span>Input Total</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'inputTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('cacheReadTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by cache read tokens"
                    >
                      <span>Cache Read</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'cacheReadTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('outputTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by output tokens"
                    >
                      <span>Output Tokens</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'outputTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('totalTokens')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by total tokens"
                    >
                      <span>Total Tokens</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'totalTokens' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('costUsd')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by total cost (USD)"
                    >
                      <span>Total Cost (USD)</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'costUsd' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('costUserCurrency')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title={`Sort by total cost (${userCurrency})`}
                    >
                      <span>Total Cost ({userCurrency})</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'costUserCurrency' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('costPerMillionInputTokensUsd')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by cost per million input tokens (USD)"
                    >
                      <span>Cost / 1M Input Tokens (USD)</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'costPerMillionInputTokensUsd' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleModelBreakdownSort('costPerMillionOutputTokensUsd')}
                      className="w-full inline-flex items-center justify-end gap-1 hover:text-gray-900 dark:hover:text-white"
                      title="Sort by cost per million output tokens (USD)"
                    >
                      <span>Cost / 1M Output Tokens (USD)</span>
                      <span className="text-[10px] opacity-70">
                        {modelBreakdownSortKey === 'costPerMillionOutputTokensUsd' ? (modelBreakdownSortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                  
                </tr>
              </thead>
              <tbody>
                {sortedModelBreakdownRows.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
                          <BarChart3 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">No model data to display</div>
                      </div>
                    </td>
                  </tr>
                )}
                {sortedModelBreakdownRows.map((row, idx) => {
                    const model = row.model
                    const isSplitUnknown = isSplitUnknownModelName(model)
                    const expandedBreakdown = row.expandedModelTokenRows
                    const hasExpandedVariants = expandedBreakdown.length > 1
                    
                    return (
                      <tr 
                        key={model} 
                        className={cn(
                          "border-b border-gray-100 dark:border-gray-700 transition-all duration-200 cursor-pointer h-10",
                          selectedModel === model
                            ? "bg-secondary-900 text-white"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        )}
                        style={{
                          animation: `fadeInRow 0.3s ease-out ${idx * 40}ms both`,
                        }}
                        onClick={() => toggleSelectedModel(model)}
                        title="Click to highlight this model on the chart"
                      >
                        <td className={cn(
                          "py-2 px-3 text-right tabular-nums align-middle",
                          selectedModel === model ? "text-white/90" : "text-gray-600 dark:text-gray-300"
                        )}>
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-center align-middle">
                          <span 
                            className="inline-block w-4 h-4 rounded-full"
                            style={{ backgroundColor: getModelBaseColor(model) }}
                            title={`${displayGroupName(model)} model color`}
                          ></span>
                        </td>
                        <td className={cn(
                          "py-2 px-3 font-medium align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="min-w-0 flex-1 truncate whitespace-nowrap" title={displayGroupName(model)}>
                              {displayGroupName(model)}
                            </span>
                            <HoverPopover
                              trigger={(
                                <span className="inline-flex items-center justify-center w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                              )}
                              side="top"
                              align="start"
                              contentClassName="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-[32rem] max-w-[90vw]"
                            >
                              <div className="font-semibold mb-2 text-primary-300">
                                {groupByMode === 'source' ? 'Source Breakdown' : 'Expanded Model Breakdown'}
                              </div>
                              <div className="mb-2 text-gray-200 break-words">
                                <span className="font-medium">
                                  {groupByMode === 'source' ? 'Source:' : 'Base model:'}
                                </span>{' '}
                                {displayGroupName(model)}
                              </div>
                              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                                {expandedBreakdown.length === 0 && (
                                  <div className="text-gray-300">No expanded model metadata available.</div>
                                )}
                                {expandedBreakdown.length === 1 && (
                                  <div className="flex justify-between gap-3">
                                    <span className="text-gray-200 break-all pr-3">
                                      {groupByMode === 'source' ? displayGroupName(expandedBreakdown[0]!.model) : expandedBreakdown[0]!.model}
                                    </span>
                                    <span className="font-semibold text-gray-100 whitespace-nowrap">{row.totalTokens.toLocaleString('en-US')}</span>
                                  </div>
                                )}
                                {expandedBreakdown.length > 1 && expandedBreakdown.map((variant) => (
                                  <div key={`${model}-${variant.model}`} className="flex justify-between gap-3">
                                    <span className="text-gray-200 break-all">
                                      {groupByMode === 'source' ? displayGroupName(variant.model) : variant.model}
                                    </span>
                                    <span className="font-medium text-gray-100 whitespace-nowrap">
                                      {variant.tokens.toLocaleString('en-US')}
                                      {percentOfTotal(variant.tokens, row.totalTokens) && (
                                        <span className="ml-1 text-[10px] text-gray-400">
                                          ({percentOfTotal(variant.tokens, row.totalTokens)})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                                <span className="text-gray-300">{hasExpandedVariants ? 'Combined total:' : 'Total tokens:'}</span>
                                <span className="font-bold">{row.totalTokens.toLocaleString('en-US')}</span>
                              </div>
                            </HoverPopover>
                            {/* Reserve space so spinner never changes row height/wrapping */}
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-3 h-3 shrink-0",
                                selectedModel === model && isHighlightPending ? "visible" : "invisible"
                              )}
                              aria-hidden={!(selectedModel === model && isHighlightPending)}
                            >
                              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white/90"></span>
                            </span>
                          </div>
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {isSplitUnknown ? (
                            '—'
                          ) : row.inputWithoutCacheWriteTokens > 0 ? (
                            <HoverPopover
                              trigger={(
                                <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                                  <span>{row.inputWithoutCacheWriteTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                              )}
                              side="top"
                              align="end"
                              contentClassName="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-64"
                            >
                              <div className="font-semibold mb-2 text-blue-300">Input Token Details</div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Input (w/o cache write):</span>
                                  <span className="font-medium">{row.inputWithoutCacheWriteTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-300">Cache Write:</span>
                                  <span className="font-medium text-orange-300">{row.inputWithCacheWriteTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-300">Output Tokens:</span>
                                  <span className="font-medium text-green-300">{row.outputTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 font-semibold">
                                  <span className="text-gray-200">I/O Subtotal:</span>
                                  <span className="font-medium text-gray-200">{(row.inputWithoutCacheWriteTokens + row.outputTokens).toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-300">Cache Read:</span>
                                  <span className="font-medium text-purple-300">{row.cacheReadTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                                  <span>Total:</span>
                                  <span>{row.totalTokens.toLocaleString('en-US')}</span>
                                </div>
                              </div>
                            </HoverPopover>
                          ) : (
                            <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                              <span>{row.inputWithoutCacheWriteTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </span>
                          )}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right tabular-nums align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {isSplitUnknown ? '—' : row.inputWithCacheWriteTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle border-l border-gray-100 dark:border-gray-700",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.inputTokens > 0 ? (
                            <HoverPopover
                              trigger={(
                                <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                                  <span>{row.inputTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                              )}
                              side="top"
                              align="end"
                              contentClassName="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-64"
                            >
                              <div className="font-semibold mb-2 text-primary-300">Input Total</div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Input (w/o cache write):</span>
                                  <span className="font-medium">
                                    {isSplitUnknown ? '—' : row.inputWithoutCacheWriteTokens.toLocaleString('en-US')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-orange-300">Cache Write:</span>
                                  <span className="font-medium text-orange-300">
                                    {isSplitUnknown ? '—' : row.inputWithCacheWriteTokens.toLocaleString('en-US')}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                                  <span className="text-gray-200 font-semibold">Input Tokens (Total):</span>
                                  <span className="font-semibold text-gray-200">
                                    {row.inputTokens.toLocaleString('en-US')}
                                    {percentOfTotal(row.inputTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.inputTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-600 pt-1 mt-1">
                                  <span className="text-purple-300">Cache Read:</span>
                                  <span className="font-medium text-purple-300">
                                    {row.cacheReadTokens.toLocaleString('en-US')}
                                    {percentOfTotal(row.cacheReadTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.cacheReadTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              {isSplitUnknown && (
                                <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                                  Showing input as total only.
                                </div>
                              )}
                            </HoverPopover>
                          ) : (
                            <span>{row.inputTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right tabular-nums align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.cacheReadTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.outputTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.totalTokens > 0 ? (
                            <HoverPopover
                              trigger={(
                                <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                                  <span>{row.totalTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </span>
                              )}
                              side="top"
                              align="end"
                              contentClassName="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-72"
                            >
                              <div className="font-semibold mb-2 text-primary-300">Complete Breakdown</div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-gray-200/90">
                                  <span>Input (w/o cache write):</span>
                                  <span className="font-medium">{isSplitUnknown ? '—' : row.inputWithoutCacheWriteTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between text-orange-200">
                                  <span>Cache Write:</span>
                                  <span className="font-medium">{isSplitUnknown ? '—' : row.inputWithCacheWriteTokens.toLocaleString('en-US')}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-blue-200 font-semibold">
                                  <span>Input Tokens (Total):</span>
                                  <span className="font-medium">
                                    {row.inputTokens.toLocaleString('en-US')}
                                    {percentOfTotal(row.inputTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.inputTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-green-200">
                                  <span>Output Tokens:</span>
                                  <span className="font-medium">
                                    {row.outputTokens.toLocaleString('en-US')}
                                    {percentOfTotal(row.outputTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.outputTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-gray-200 font-semibold">
                                  <span>I/O Subtotal:</span>
                                  <span className="font-medium">
                                    {(row.inputTokens + row.outputTokens).toLocaleString('en-US')}
                                    {percentOfTotal(row.inputTokens + row.outputTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.inputTokens + row.outputTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-purple-200">
                                  <span>Cache Read:</span>
                                  <span className="font-medium">
                                    {row.cacheReadTokens.toLocaleString('en-US')}
                                    {percentOfTotal(row.cacheReadTokens, row.totalTokens) && (
                                      <span className="ml-2 text-[10px] text-gray-400 font-normal">
                                        ({percentOfTotal(row.cacheReadTokens, row.totalTokens)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                                  <span>Total:</span>
                                  <span>{row.totalTokens.toLocaleString('en-US')}</span>
                                </div>
                              </div>
                              {isSplitUnknown && (
                                <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                                  Showing input as total only.
                                </div>
                              )}
                            </HoverPopover>
                          ) : (
                            <span>{row.totalTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          ${row.costUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {formatCurrency(row.costUserCurrency, userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.costPerMillionInputTokensUsd > 0 ? (
                            <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                              <span>${row.costPerMillionInputTokensUsd.toFixed(2)}</span>
                              {referenceCostPerMillionInputUsd && (
                                <span className="text-xs text-gray-500 dark:text-gray-300">
                                  ({(row.costPerMillionInputTokensUsd / referenceCostPerMillionInputUsd).toFixed(1)}x)
                                </span>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={cn(
                          "py-2 px-3 text-right align-middle",
                          selectedModel === model ? "text-white" : "text-gray-900 dark:text-white"
                        )}>
                          {row.costPerMillionOutputTokensUsd > 0 ? (
                            <span className="inline-flex items-center justify-end gap-1 w-full text-right">
                              <span>${row.costPerMillionOutputTokensUsd.toFixed(2)}</span>
                              {referenceCostPerMillionOutputUsd && (
                                <span className="text-xs text-gray-500 dark:text-gray-300">
                                  ({(row.costPerMillionOutputTokensUsd / referenceCostPerMillionOutputUsd).toFixed(1)}x)
                                </span>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="py-3 px-3 text-gray-900 dark:text-white" colSpan={3}>Total</td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {filteredData.reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        if (isSplitUnknownModelName(usage.model)) return sum
                        return sum + (usage.tokenBreakdown.inputWithoutCacheWrite || 0)
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {filteredData.reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        if (isSplitUnknownModelName(usage.model)) return sum
                        return sum + (usage.tokenBreakdown.inputWithCacheWrite || 0)
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white border-l border-gray-200 dark:border-gray-600">
                    {filteredData.reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        return (
                          sum +
                          (usage.tokenBreakdown.inputWithCacheWrite || 0) +
                          (usage.tokenBreakdown.inputWithoutCacheWrite || 0)
                        )
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {filteredData.reduce((sum, usage) => {
                      if (usage.tokenBreakdown) return sum + (usage.tokenBreakdown.cacheRead || 0)
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {filteredData.reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        return sum + usage.tokenBreakdown.output
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {filteredData.reduce((sum, usage) => sum + (usage.tokens || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    ${filteredData.reduce((sum, usage) => sum + (usage.costUsd || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(convertFromUSD(filteredData.reduce((sum, usage) => sum + (usage.costUsd || 0), 0)), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    ${(() => {
                      const inputTokens = filteredData.reduce((sum, usage) => {
                        if (usage.tokenBreakdown) {
                          return (
                            sum +
                            (usage.tokenBreakdown.inputWithCacheWrite || 0) +
                            (usage.tokenBreakdown.inputWithoutCacheWrite || 0)
                          )
                        }
                        return sum
                      }, 0)
                      const totalCosts = filteredData.reduce((sum, usage) => sum + (usage.costUsd || 0), 0)
                      return inputTokens > 0 ? ((totalCosts / inputTokens) * 1_000_000).toFixed(2) : '—'
                    })()}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    ${(() => {
                      const output = filteredData.reduce((sum, usage) => {
                        if (usage.tokenBreakdown) return sum + (usage.tokenBreakdown.output || 0)
                        return sum
                      }, 0)
                      const totalCosts = filteredData.reduce((sum, usage) => sum + (usage.costUsd || 0), 0)
                      return output > 0 ? ((totalCosts / output) * 1_000_000).toFixed(2) : '—'
                    })()}
                  </td>
                  
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center" style={{ backgroundColor: 'transparent' }}>
            Showing data for {chartData.length} {aggregationMode}{chartData.length !== 1 ? 's' : ''} 
            {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed view active</span>}
          </div>
        </div>


        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tokens Card */}
          <div className="bg-white dark:bg-gray-700 border-2 border-secondary-300 dark:border-gray-600 rounded-lg p-3 shadow-sm transition-colors duration-200">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-secondary-800 dark:text-gray-200">Total Tokens</h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {filteredTotals.tokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Across {chartData.length} {aggregationMode}s
                {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed</span>}
              </div>
            </div>
          </div>

          {/* Total Costs (USD) Card */}
          <div className="bg-white dark:bg-gray-700 border-2 border-secondary-300 dark:border-gray-600 rounded-lg p-3 shadow-sm transition-colors duration-200">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-secondary-800 dark:text-gray-200">Total Costs (USD)</h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                ${filteredTotals.costUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {activeBucketCount} active {aggregationMode}s
                {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed</span>}
              </div>
            </div>
          </div>

          {/* Models Used Card */}
          <div className="bg-white dark:bg-gray-700 border-2 border-secondary-300 dark:border-gray-600 rounded-lg p-3 shadow-sm transition-colors duration-200">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-secondary-800 dark:text-gray-200">Models Used</h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {filteredTotals.modelsUsed}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                AI model types
                {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed</span>}
              </div>
            </div>
          </div>
          
          {/* Total Costs (User Currency) Card */}
          <div 
            className={`bg-white dark:bg-gray-700 border-2 border-secondary-300 dark:border-gray-600 rounded-lg p-3 shadow-sm transition-colors duration-200 ${currentUser ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600' : ''}`}
            onClick={currentUser ? () => setShowCurrencySelectorModal(true) : undefined}
            title={currentUser ? 'Click to change currency' : undefined}
          >
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-secondary-800 dark:text-gray-200 flex items-center justify-between">
                <span>Total Costs ({userCurrency})</span>
                {currentUser && (
                  <svg className="w-4 h-4 text-black dark:text-primary-500 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(convertFromUSD(filteredTotals.costUsd), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Converted from USD
                {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed</span>}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add padding below the summary cards for copy image */}
      <div className="copy-padding pb-6 hidden"></div>

      {/* Source Band (hidden in UI, shown in copy) */}
      <div className="source-band bg-secondary-900 text-white py-3 px-6 -mx-6 -mb-6 mt-4 hidden" style={{ borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}>
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            {useWhiteLabelBranding ? (
              <>
                <span className="text-sm font-medium">
                  {orgDisplayName ? 'Report generated for' : 'Report generated'}
                </span>
                {orgDisplayName && (
                  <span className="text-sm font-semibold">
                    {orgDisplayName}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-sm font-medium">Chart generated by</span>
                <a
                  href="https://aicoder.guru/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white hover:text-primary-300 font-semibold underline transition-colors"
                  aria-label="Visit AICoder.Guru website"
                >
                  <img
                    src="/logos/jade-guru.svg"
                    alt="AICoder.Guru logo"
                    className="w-4 h-4"
                  />
                  <span>AICoder.Guru</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Currency Selector Modal for Chart Footer */}
      {currentUser && (
        <CurrencySelector
          isOpen={showCurrencySelectorModal}
          onClose={() => setShowCurrencySelectorModal(false)}
        />
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-500/40 rounded-xl flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg flex items-center space-x-4">
            {/* Green Spinner */}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <div className="text-gray-700">
              <div className="font-medium">Loading usage data</div>
              <div className="text-sm text-gray-500">Please wait...</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
} 