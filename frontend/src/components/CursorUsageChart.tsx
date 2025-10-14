import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import * as htmlToImage from 'html-to-image';
import { CursorUsageV2 as CursorUsage } from '@shared'
import { cn } from '@/lib/utils'
import { DateRangePicker } from './DateRangePicker'
import { DateRange } from 'react-day-picker'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import CurrencySelector from './CurrencySelector'

interface CursorUsageChartProps {
  data: CursorUsage[]
  isLoading?: boolean
  costDifference?: number | null
  lastPastedDataCost?: number
}

interface ChartData {
  date: string
  fullDate: Date
  costPerMillionTokens: number
  [model: string]: string | number | Date
}

type TimePeriod = 'last24h' | 'last48h' | 'last7d' | 'last30d' | 'custom'

export default function CursorUsageChart({ data, isLoading = false, costDifference, lastPastedDataCost }: CursorUsageChartProps) {
  const [aggregationMode, setAggregationMode] = useState<'day' | 'hour' | '15min'>('hour')
  const [metricMode, setMetricMode] = useState<'tokens' | 'costs'>('tokens')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last24h')
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
  const { userCurrency, formatCurrency, convertFromUSD } = useCurrency()
  const { actualTheme } = useTheme()
  const [showCurrencySelectorModal, setShowCurrencySelectorModal] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState<string>('')
  const [highlightedModel, setHighlightedModel] = useState<string | null>(null)
  const [showCostPerMillionLine, setShowCostPerMillionLine] = useState(false)

  // Functions to handle model highlighting
  const highlightModel = (model: string) => {
    setHighlightedModel(model)
  }

  const unhighlightModel = () => {
    setHighlightedModel(null)
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
    if (data.length === 0) return { earliest: new Date(), latest: new Date() }
    
    const dates = data.map(usage => (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date)))
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
    const latest = new Date(Math.max(...dates.map(d => d.getTime())))
    
    return { earliest, latest }
  }

  // Parse the date format "May 24, 2025, 01:50 PM"
  const parseDateTime = (dateStr: string): Date => {
    try {
      const parsed = new Date(dateStr)
      if (isNaN(parsed.getTime())) {
        console.warn('Invalid date parsed:', dateStr)
        return new Date()
      }
      return parsed
    } catch (error) {
      console.warn('Could not parse date:', dateStr, error)
      return new Date()
    }
  }

  // Auto-adjust chart settings when new data is imported
  useEffect(() => {
    if (data.length === 0) return

    const { earliest, latest } = getDataBoundaries()
    const dataSpanHours = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60)

    // Reset zoom when new data comes in
    setZoomRange(null)

    // Always initialize to the file's full date range in Custom mode so user can edit both ends
    setTimePeriod('custom')
    setAggregationMode(dataSpanHours > 168 ? 'day' : dataSpanHours > 48 ? 'hour' : '15min')

    setCustomStartDate(earliest.toISOString().split('T')[0])
    setCustomEndDate(latest.toISOString().split('T')[0])
    setCustomStartTime('00:00')
    setCustomEndTime('23:59')

    setDateRange({ from: earliest, to: latest })
  }, [data.length, data]) // Trigger when data changes

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
    
    // Auto-select appropriate aggregation mode
    if (newPeriod === 'last24h' || newPeriod === 'last48h') {
      setAggregationMode('15min')
    } else if (newPeriod === 'last7d') {
      setAggregationMode('hour')
    } else if (newPeriod === 'last30d') {
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
  const getAggregationKey = (date: Date, mode: 'day' | 'hour' | '15min'): string => {
    if (mode === 'day') {
      return date.toISOString().split('T')[0] // YYYY-MM-DD
    } else if (mode === 'hour') {
      const isoString = date.toISOString()
      return isoString.split(':')[0] // YYYY-MM-DDTHH
    } else {
      // 15min: YYYY-MM-DDTHH:MM (rounded to nearest 15)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, '0')
      return `${year}-${month}-${day}T${hour}:${minute}`
    }
  }

  // Get display label for aggregation
  const getDisplayLabel = (date: Date, mode: 'day' | 'hour' | '15min'): string => {
    if (mode === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (mode === 'hour') {
      const dayLabel = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
      const hourLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false }).replace(':00', '')
      return `${dayLabel} ${hourLabel}h`
    } else {
      const dayLabel = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(Math.floor(date.getMinutes() / 15) * 15).padStart(2, '0')
      return `${dayLabel} ${hour}:${minute}`
    }
  }

  // Filter data based on selected time period
  const getFilteredData = (): CursorUsage[] => {
    if (data.length === 0) return []
    
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (timePeriod) {
      case 'last24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        // Set end date to end of today to include all real-time data
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
      case 'last48h':
        startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000)
        // Set end date to end of today to include all real-time data
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
      case 'last7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        // Set end date to end of today to include all real-time data
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
      case 'last30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        // Set end date to end of today to include all real-time data
        endDate = new Date()
        endDate.setHours(23, 59, 59, 999)
        break
      case 'custom':
        if (customStartDate) {
          if ((aggregationMode === 'hour' || aggregationMode === '15min') && customStartTime) {
            startDate = new Date(customStartDate + 'T' + customStartTime + ':00')
          } else {
            startDate = new Date(customStartDate + 'T00:00:00')
          }
        }
        if (customEndDate) {
          if ((aggregationMode === 'hour' || aggregationMode === '15min') && customEndTime) {
            endDate = new Date(customEndDate + 'T' + customEndTime + ':59')
          } else {
            endDate = new Date(customEndDate + 'T23:59:59')
          }
        }
        break
    }

    const filteredData = data.filter(usage => {
      const usageDate = (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date))
      if (startDate && usageDate < startDate) return false
      if (endDate && usageDate > endDate) return false
      return true
    })

    // If no data matches the filter, but we have data available, 
    // return a minimal dataset to prevent chart from disappearing
    if (filteredData.length === 0 && data.length > 0) {
      console.log('No data in selected range, showing data boundaries instead')
      const { earliest, latest } = getDataBoundaries()
      
      // If the selected range is completely before our data, show earliest data
      if (endDate && endDate < earliest) {
        return data.filter(usage => {
          const usageDate = (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date))
          return usageDate >= earliest && usageDate <= new Date(earliest.getTime() + 24 * 60 * 60 * 1000)
        })
      }
      
      // If the selected range is completely after our data, show latest data
      if (startDate && startDate > latest) {
        return data.filter(usage => {
          const usageDate = (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date))
          return usageDate >= new Date(latest.getTime() - 24 * 60 * 60 * 1000) && usageDate <= latest
        })
      }
    }

    return filteredData
  }

  // Process and aggregate data with zoom filtering
  const processData = (): ChartData[] => {
    const filteredData = getFilteredData()
    if (filteredData.length === 0) return []

    // Group data by the selected aggregation mode
    const groupedData = filteredData.reduce((acc, usage) => {
      const fullDate = (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date))
      const key = getAggregationKey(fullDate, aggregationMode)
      
      if (!acc[key]) {
        acc[key] = { models: {}, modelInput: {}, modelOutput: {}, fullDate }
      }
      if (!acc[key].models[usage.model]) {
        acc[key].models[usage.model] = 0
        acc[key].modelInput[usage.model] = 0
        acc[key].modelOutput[usage.model] = 0
      }
      
      // For tokens mode, separate input and output tokens
      if (metricMode === 'tokens' && usage.tokenBreakdown) {
        const inputTokens = usage.tokenBreakdown.inputWithCacheWrite + usage.tokenBreakdown.inputWithoutCacheWrite
        const outputTokens = usage.tokenBreakdown.output
        acc[key].modelInput[usage.model] += inputTokens
        acc[key].modelOutput[usage.model] += outputTokens
        acc[key].models[usage.model] += inputTokens + outputTokens
      } else if (metricMode === 'tokens') {
        acc[key].models[usage.model] += usage.tokens
      } else {
        acc[key].models[usage.model] += (usage.costUsd || 0)
      }
      
      return acc
    }, {} as { [key: string]: { models: { [model: string]: number }, modelInput: { [model: string]: number }, modelOutput: { [model: string]: number }, fullDate: Date } })

    // Get date range
    const allDates = filteredData.map(usage => (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date)))
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    // Generate complete time series
    const completeData: ChartData[] = []
    const current = new Date(minDate)

    // Get all unique models to ensure consistent data structure
    const allModels = Array.from(new Set(filteredData.map(usage => usage.model)))

    while (current <= maxDate) {
      const key = getAggregationKey(current, aggregationMode)
      const displayLabel = getDisplayLabel(current, aggregationMode)
      
      const chartEntry: ChartData = {
        date: displayLabel,
        fullDate: new Date(current),
        costPerMillionTokens: 0,
      }

      // Initialize all models with 0 (for both input and output)
      allModels.forEach(model => {
        chartEntry[model] = 0
        chartEntry[`${model}_input`] = 0
        chartEntry[`${model}_output`] = 0
      })

      // Fill in actual data if it exists
      if (groupedData[key]) {
        Object.entries(groupedData[key].models).forEach(([model, total]) => {
          chartEntry[model] = total
        })
        Object.entries(groupedData[key].modelInput).forEach(([model, input]) => {
          chartEntry[`${model}_input`] = input
        })
        Object.entries(groupedData[key].modelOutput).forEach(([model, output]) => {
          chartEntry[`${model}_output`] = output
        })
      }

      // Calculate cost per million tokens for this time period
      const periodData = filteredData.filter(usage => {
        const usageDate = (typeof (usage as any).timestamp === 'number' ? new Date((usage as any).timestamp) : parseDateTime(usage.date))
        const usageKey = getAggregationKey(usageDate, aggregationMode)
        return usageKey === key
      })

      const periodTokens = periodData.reduce((sum, usage) => sum + (usage.tokens || 0), 0)
      const periodCosts = periodData.reduce((sum, usage) => sum + (usage.costUsd || 0), 0)
      chartEntry.costPerMillionTokens = periodTokens > 0 ? (periodCosts / periodTokens) * 1000000 : 0

      completeData.push(chartEntry)

      // Increment time period
      if (aggregationMode === 'day') {
        current.setDate(current.getDate() + 1)
      } else if (aggregationMode === 'hour') {
        current.setHours(current.getHours() + 1)
      } else {
        current.setMinutes(current.getMinutes() + 15)
      }
    }

    // Apply zoom filtering if zoom range exists
    if (zoomRange) {
      return completeData.slice(zoomRange.start, zoomRange.end + 1)
    }

    return completeData
  }

  const chartData = processData()
  
  // Get all unique models from the original data
  const allModels = Array.from(new Set(data.map(usage => usage.model)))
  
  // Check if we're showing fallback data due to invalid date range
  const isShowingFallbackData = () => {
    if (timePeriod !== 'custom' || !customStartDate || !customEndDate) return false
    
    const { earliest, latest } = getDataBoundaries()
    const startDateTime = new Date(customStartDate + 'T' + customStartTime + ':00')
    const endDateTime = new Date(customEndDate + 'T' + customEndTime + ':59')
    
    // Check if the selected range is completely outside data boundaries
    return (endDateTime < earliest) || (startDateTime > latest)
  }


  
  // Enhanced color palette system with mathematical variations for better distinction
  const getCoreColors = () => [
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
    '#D7BDE2'  // Light Purple
  ]
  
  const generateColorVariations = (baseColors: string[], totalNeeded: number) => {
    const colors: string[] = [...baseColors]
    
    // If we need more colors than our base palette, generate variations
    if (totalNeeded > baseColors.length) {
      const baseCount = baseColors.length
      
      for (let i = baseCount; i < totalNeeded; i++) {
        const baseIndex = i % baseCount
        const baseColor = baseColors[baseIndex]
        
        // Convert hex to HSL for manipulation
        const hsl = hexToHsl(baseColor)
        
        // Calculate variation level (how many times we've cycled through base colors)
        const variationLevel = Math.floor(i / baseCount)
        
        let newHsl: { h: number, s: number, l: number }
        
        switch (variationLevel) {
          case 1:
            // First variation: Darker shades (reduce lightness by 25%)
            newHsl = {
              h: hsl.h,
              s: Math.min(100, hsl.s + 10), // Slightly more saturated
              l: Math.max(20, hsl.l - 25)   // Darker
            }
            break
          case 2:
            // Second variation: Lighter shades (increase lightness by 20%)
            newHsl = {
              h: hsl.h,
              s: Math.max(30, hsl.s - 15), // Less saturated
              l: Math.min(80, hsl.l + 20)  // Lighter
            }
            break
          case 3:
            // Third variation: Hue shift (+60 degrees)
            newHsl = {
              h: (hsl.h + 60) % 360,
              s: hsl.s,
              l: hsl.l
            }
            break
          case 4:
            // Fourth variation: Hue shift (-60 degrees) with saturation boost
            newHsl = {
              h: (hsl.h - 60 + 360) % 360,
              s: Math.min(100, hsl.s + 20),
              l: Math.max(25, hsl.l - 15)
            }
            break
          default:
            // Fallback: Use golden angle distribution with controlled saturation/lightness
            const goldenAngle = 137.508
            newHsl = {
              h: (i * goldenAngle) % 360,
              s: 65 + (i % 4) * 8,  // Vary saturation: 65%, 73%, 81%, 89%
              l: 45 + (i % 3) * 10  // Vary lightness: 45%, 55%, 65%
            }
        }
        
        colors.push(hslToHex(newHsl.h, newHsl.s, newHsl.l))
      }
    }
    
    return colors
  }
  
  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): { h: number, s: number, l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2
    
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }
  
  // Helper function to convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    h = h / 360
    s = s / 100
    l = l / 100
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    let r, g, b
    
    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
  
  const getModelColor = (index: number) => {
    const coreColors = getCoreColors()
    const totalModels = allModels.length
    
    // Create a strategic color assignment to maximize visual separation
    // Instead of sequential assignment, use a pattern that spreads colors out
    let colorIndex: number
    
    if (totalModels <= coreColors.length) {
      // For small numbers of models, use every nth color to maximize separation
      const step = Math.max(1, Math.floor(coreColors.length / totalModels))
      colorIndex = (index * step) % coreColors.length
    } else {
      // For many models, use the variation system but with better distribution
      const colors = generateColorVariations(coreColors, totalModels)
      colorIndex = index
      
      // Debug logging to see what's happening
      if (index < 10) { // Only log first 10 to avoid spam
        console.log(`Model ${index}: ${allModels[index]} -> Color: ${colors[colorIndex]}`)
      }
      
      return colors[colorIndex] || colors[colorIndex % colors.length]
    }
    
    // Debug logging
    if (index < 10) {
      console.log(`Model ${index}: ${allModels[index]} -> Color: ${coreColors[colorIndex]}`)
    }
    
    return coreColors[colorIndex]
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the corresponding chart data to get the full date
      const dataPoint = chartData.find(d => d.date === label)
      const barPayload = payload.filter((entry: any) => entry.dataKey !== 'costPerMillionTokens')
      const linePayload = payload.find((entry: any) => entry.dataKey === 'costPerMillionTokens')
      
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
            const model = entry.dataKey.replace('_input', '')
            if (!modelGroups[model]) modelGroups[model] = { input: 0, output: 0, inputColor: '', outputColor: '' }
            modelGroups[model].input = entry.value
            modelGroups[model].inputColor = entry.color
          } else if (isOutput) {
            const model = entry.dataKey.replace('_output', '')
            if (!modelGroups[model]) modelGroups[model] = { input: 0, output: 0, inputColor: '', outputColor: '' }
            modelGroups[model].output = entry.value
            modelGroups[model].outputColor = entry.color
          }
        })
        
        const totalTokens = Object.values(modelGroups).reduce((sum, g) => sum + g.input + g.output, 0)
        
        return (
          <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl min-w-[250px] z-[9999]" style={{ backgroundColor: 'white', position: 'relative', zIndex: 9999 }}>
            <p className="font-semibold text-gray-900 mb-2">
              {dataPoint?.fullDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric',
                ...(aggregationMode === 'hour' && {
                  hour: 'numeric',
                  hour12: true
                })
              })}
            </p>
            {Object.entries(modelGroups)
              .filter(([_, data]) => data.input > 0 || data.output > 0)
              .map(([model, data]) => (
                <div key={model} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">{model}</p>
                  <div className="pl-2 space-y-0.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.inputColor }}></span>
                        <span className="text-gray-600">Input:</span>
                      </span>
                      <span className="font-medium text-gray-900">{formatValue(data.input)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.outputColor }}></span>
                        <span className="text-gray-600">Output:</span>
                      </span>
                      <span className="font-medium text-gray-900">{formatValue(data.output)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-0.5">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="font-semibold text-gray-900">{formatValue(data.input + data.output)}</span>
                    </div>
                  </div>
                </div>
              ))}
            {totalTokens > 0 && (
              <div className="border-t border-gray-300 mt-2 pt-2">
                <p className="text-sm font-bold text-gray-900 flex justify-between">
                  <span>Total:</span>
                  <span>{formatValue(totalTokens)} tokens</span>
                </p>
              </div>
            )}
            {linePayload && linePayload.value > 0 && (
              <div className="border-t border-gray-300 mt-2 pt-2">
                <p className="text-xs font-medium text-red-600">
                  Cost per Million: ${linePayload.value.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )
      }
      
      // Original tooltip for costs mode
      const totalValue = barPayload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0)
      return (
        <div className="p-3 border border-gray-200 rounded-lg shadow-xl z-[9999]" style={{ backgroundColor: 'white', position: 'relative', zIndex: 9999 }}>
          <p className="font-semibold text-gray-900 mb-2">
            {dataPoint?.fullDate.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric',
              ...(aggregationMode === 'hour' && {
                hour: 'numeric',
                hour12: true
              })
            })}
          </p>
          {barPayload
            .filter((entry: any) => entry.value > 0)
            .map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.dataKey}: {formatValue(entry.value)} {unit}
              </p>
            ))}
          {totalValue > 0 && (
            <div className="border-t border-gray-300 mt-2 pt-2">
              <p className="text-sm font-medium text-gray-900">
                Total: {formatValue(totalValue)} {unit}
              </p>
            </div>
          )}
        </div>
      )
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

  if (chartData.length === 0) {
    return null
  }

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
        {/* Top Bar - Fueld Midnight Green (hidden in UI, shown in copy) */}
        <div className="top-bar bg-secondary-800 py-3 -mx-6 -mt-6 mb-4 hidden" style={{ borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem' }}></div>
      
      <div className="flex items-start justify-between mb-2">
        {/* Left section for title */}
        <div className="flex-grow mr-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200">
            {aggregationMode === 'day' ? 'Daily' : aggregationMode === 'hour' ? 'Hourly' : '15-Minute'} I/O Tokens by Model
            {timePeriod && (
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400 ml-2">
                ({timePeriod === 'last24h' ? 'Last 24 Hours' :
                  timePeriod === 'last48h' ? 'Last 48 Hours' :
                  timePeriod === 'last7d' ? 'Last 7 Days' :
                  timePeriod === 'last30d' ? 'Last 30 Days' :
                  timePeriod === 'custom' ? 'Custom Range' : ''})
              </span>
            )}
          </h3>
        </div>

        {/* Right section for controls and copy button - responsive layout */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full md:w-auto md:flex-nowrap [@media(max-width:719px)]:flex-col [@media(max-width:719px)]:items-stretch">
          {/* Time Period Selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 transition-colors duration-200 mb-1 md:mb-0 max-w-[150px]">
            <button onClick={() => handleTimePeriodChange('last24h')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", timePeriod === 'last24h' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>1D</button>
            <button onClick={() => handleTimePeriodChange('last48h')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", timePeriod === 'last48h' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>2D</button>
            <button onClick={() => handleTimePeriodChange('last7d')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", timePeriod === 'last7d' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>1W</button>
            <button onClick={() => handleTimePeriodChange('last30d')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", timePeriod === 'last30d' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>1M</button>
            <button onClick={() => handleTimePeriodChange('custom')} className={cn("px-1 py-1 text-xs font-medium rounded transition-colors", timePeriod === 'custom' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')} title="Custom Date Range">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
          </div>
          {/* Metric Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 transition-colors duration-200 mb-1 md:mb-0 max-w-[110px]">
            <button onClick={() => setMetricMode('tokens')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", metricMode === 'tokens' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>Tokens</button>
            <button onClick={() => setMetricMode('costs')} className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", metricMode === 'costs' ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white')}>Costs</button>
          </div>

          <div className="flex items-center rounded-lg p-0.5 transition-colors duration-200 mb-1 md:mb-0">
            {/* Aggregation Toggle + Copy Button (responsive group) */}
            <div
              className="
                flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 transition-colors duration-200 mb-1
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
                    "px-2 py-1 text-xs font-medium rounded transition-colors",
                    aggregationMode === 'day'
                      ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setAggregationMode('hour')}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded transition-colors",
                    aggregationMode === 'hour'
                      ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  Hourly
                </button>
                <button
                  onClick={() => setAggregationMode('15min')}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded transition-colors",
                    aggregationMode === '15min'
                      ? 'bg-gray-400 dark:bg-gray-600 text-gunmetal-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  15m
                </button>
              </div>
            </div>

            

            {/* Copy Chart Button */}
            <button
              onClick={handleCopyChart}
              className="bg-white border-2 border-secondary-800 text-secondary-800 px-3 py-1.5 rounded-lg hover:bg-secondary-50 dark:bg-white dark:border-secondary-800 dark:text-secondary-800 dark:hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md ml-2"
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

      {/* Description and entry count on a new line */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
          {metricMode === 'tokens' ? 'I/O tokens (input + output, excluding cache)' : 'Total costs'} per {aggregationMode}, segmented by AI model
        </p>
        {getFilteredData().length !== data.length && (
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Showing {getFilteredData().length} of {data.length} entries
          </p>
        )}
        {isShowingFallbackData() && (
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">
            Selected date range is outside available data - showing nearest available data
          </p>
        )}
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
              {(aggregationMode === 'hour' || aggregationMode === '15min') && (
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
      <div className="h-96 w-full" ref={chartRef} style={{ isolation: 'isolate' }}>
        {/* Chart container with event handling */}
        <div 
          className="relative h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: aggregationMode === 'hour' ? 10 : aggregationMode === '15min' ? 8 : 12, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="#9ca3af"
                interval={aggregationMode === 'hour' ? 'preserveStartEnd' : aggregationMode === '15min' ? 'preserveStart' : 0}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#9ca3af"
              />
              {showCostPerMillionLine && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
              )}
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 9999, position: 'relative' }}
                allowEscapeViewBox={{ x: true, y: true }}
                position={{ y: 0 }}
              />
              
              {/* Create stacked bars for each model - Input (bottom) and Output (top) */}
              {metricMode === 'tokens' ? (
                allModels.map((model, index) => {
                  const isDimmed = highlightedModel !== null && highlightedModel !== model
                  const baseColor = getModelColor(index)
                  
                  // Convert hex to RGB for color manipulation
                  const hexToRgb = (hex: string) => {
                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
                    return result ? {
                      r: parseInt(result[1], 16),
                      g: parseInt(result[2], 16),
                      b: parseInt(result[3], 16)
                    } : { r: 0, g: 0, b: 0 }
                  }
                  
                  const rgb = hexToRgb(baseColor)
                  const inputColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)` // Darker/more opaque for input
                  const outputColor = `rgba(${Math.min(rgb.r + 50, 255)}, ${Math.min(rgb.g + 50, 255)}, ${Math.min(rgb.b + 50, 255)}, 0.7)` // Lighter for output
                  
                  return (
                    <React.Fragment key={model}>
                      {/* Input tokens bar (bottom of stack) */}
                      <Bar
                        yAxisId="left"
                        dataKey={`${model}_input`}
                        stackId="usage"
                        fill={inputColor}
                        name={`${model} (Input)`}
                        opacity={isDimmed ? 0.3 : 1}
                        style={{
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      />
                      {/* Output tokens bar (top of stack) */}
                      <Bar
                        yAxisId="left"
                        dataKey={`${model}_output`}
                        stackId="usage"
                        fill={outputColor}
                        name={`${model} (Output)`}
                        opacity={isDimmed ? 0.3 : 1}
                        style={{
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      />
                    </React.Fragment>
                  )
                })
              ) : (
                // For costs mode, use single bars
                allModels.map((model, index) => {
                  const isDimmed = highlightedModel !== null && highlightedModel !== model
                  
                  return (
                    <Bar
                      key={model}
                      yAxisId="left"
                      dataKey={model}
                      stackId="usage"
                      fill={getModelColor(index)}
                      name={model}
                      opacity={isDimmed ? 0.3 : 0.8}
                      style={{
                        transition: 'opacity 0.2s ease-in-out'
                      }}
                    />
                  )
                })
              )}
              
              {/* Cost per Million Tokens Line */}
              {showCostPerMillionLine && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="costPerMillionTokens"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                  name="Cost per Million Tokens"
                />
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
              const filteredData = getFilteredData()
              if (filteredData.length === 0) return 'No data available'
              
              // Find the most recent data point
              const latestDataPoint = filteredData.reduce((latest, current) => {
                const currentDate = parseDateTime(current.date)
                const latestDate = parseDateTime(latest.date)
                return currentDate > latestDate ? current : latest
              })
              
              const latestDate = parseDateTime(latestDataPoint.date)
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
            {metricMode === 'tokens' && highlightedModel && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {highlightedModel}:
                </span>
                {(() => {
                  const modelIndex = allModels.indexOf(highlightedModel)
                  const baseColor = getModelColor(modelIndex)
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
                        <span className="text-xs text-gray-600 dark:text-gray-400">Input</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: outputColor }}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Output</span>
                      </div>
                    </>
                  )
                })()}
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
                    style={{ backgroundColor: getModelColor(originalIndex) }}
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
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Model Breakdown ({timePeriod === 'custom' ? 'Custom Range' : timePeriod})</h4>
            
            {/* Cost per Million Tokens Line Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Show cost efficiency line</span>
              <button
                onClick={() => setShowCostPerMillionLine(!showCostPerMillionLine)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  showCostPerMillionLine ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showCostPerMillionLine ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Color</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Model</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Input Tokens</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Output Tokens</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Tokens</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Cost (USD)</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Cost ({userCurrency})</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cost per Million Tokens (USD)</th>
                  
                </tr>
              </thead>
              <tbody>
                {allModels
                  .filter(model => getFilteredData().some(u => u.model === model))
                  .map((model) => {
                    const originalIndex = allModels.indexOf(model)
                    
                    // Always calculate the true values from the filtered underlying data
                    const modelTokens = getFilteredData().reduce((sum, usage) => {
                      return usage.model === model ? sum + (usage.tokens || 0) : sum
                    }, 0)
                    
                    // Calculate input and output tokens separately
                    const modelInputTokens = getFilteredData().reduce((sum, usage) => {
                      if (usage.model === model && usage.tokenBreakdown) {
                        return sum + usage.tokenBreakdown.inputWithCacheWrite + usage.tokenBreakdown.inputWithoutCacheWrite
                      }
                      return sum
                    }, 0)
                    
                    const modelOutputTokens = getFilteredData().reduce((sum, usage) => {
                      if (usage.model === model && usage.tokenBreakdown) {
                        return sum + usage.tokenBreakdown.output
                      }
                      return sum
                    }, 0)
                    
                    const modelCostsUSD = getFilteredData().reduce((sum, usage) => {
                      return usage.model === model ? sum + (usage.costUsd || 0) : sum
                    }, 0)
                    const modelCostsUserCurrency = convertFromUSD(modelCostsUSD)
                    const costPerMillionTokens = modelTokens > 0 ? (modelCostsUSD / modelTokens) * 1000000 : 0
                    
                    return (
                      <tr 
                        key={model} 
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer"
                        onMouseEnter={() => highlightModel(model)}
                        onMouseLeave={() => unhighlightModel()}
                      >
                        <td className="py-2 px-3 text-center">
                          <span 
                            className="inline-block w-4 h-4 rounded-full"
                            style={{ backgroundColor: getModelColor(originalIndex) }}
                            title={`${model} model color`}
                          ></span>
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">
                          {model}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white group/input-chart relative">
                          <div className="flex items-center justify-end space-x-1">
                            <span>{modelInputTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            {modelInputTokens > 0 && (
                              <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          {modelInputTokens > 0 && (() => {
                            const modelCacheRead = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.cacheRead
                              }
                              return sum
                            }, 0)
                            const modelInputWithCache = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.inputWithCacheWrite
                              }
                              return sum
                            }, 0)
                            const modelInputWithoutCache = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.inputWithoutCacheWrite
                              }
                              return sum
                            }, 0)
                            
                            return (
                              <div className="invisible group-hover/input-chart:visible absolute right-0 top-full mt-1 z-50 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-64">
                                <div className="font-semibold mb-2 text-blue-300">Input Token Details</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Input (w/ Cache Write):</span>
                                    <span className="font-medium">{modelInputWithCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Input (w/o Cache Write):</span>
                                    <span className="font-medium">{modelInputWithoutCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-green-300">Output Tokens:</span>
                                    <span className="font-medium text-green-300">{modelOutputTokens.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-orange-300">Cache Write:</span>
                                    <span className="font-medium text-orange-300">{modelInputWithCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-purple-300">Cache Read:</span>
                                    <span className="font-medium text-purple-300">{modelCacheRead.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                                    <span>Total:</span>
                                    <span>{modelTokens.toLocaleString('en-US')}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          {modelOutputTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white group/total-chart relative">
                          <div className="flex items-center justify-end space-x-1">
                            <span>{modelTokens.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            {modelTokens > 0 && (
                              <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          {modelTokens > 0 && (() => {
                            const modelCacheRead = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.cacheRead
                              }
                              return sum
                            }, 0)
                            const modelInputWithCache = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.inputWithCacheWrite
                              }
                              return sum
                            }, 0)
                            const modelInputWithoutCache = getFilteredData().reduce((sum, usage) => {
                              if (usage.model === model && usage.tokenBreakdown) {
                                return sum + usage.tokenBreakdown.inputWithoutCacheWrite
                              }
                              return sum
                            }, 0)
                            
                            return (
                              <div className="invisible group-hover/total-chart:visible absolute right-0 top-full mt-1 z-50 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl w-72">
                                <div className="font-semibold mb-2 text-primary-300">Complete Breakdown</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-blue-200">
                                    <span>Input (w/ Cache Write):</span>
                                    <span className="font-medium">{modelInputWithCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between text-blue-200">
                                    <span>Input (w/o Cache Write):</span>
                                    <span className="font-medium">{modelInputWithoutCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between text-green-200">
                                    <span>Output Tokens:</span>
                                    <span className="font-medium">{modelOutputTokens.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1 text-orange-200">
                                    <span>Cache Write:</span>
                                    <span className="font-medium">{modelInputWithCache.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between text-purple-200">
                                    <span>Cache Read:</span>
                                    <span className="font-medium">{modelCacheRead.toLocaleString('en-US')}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold">
                                    <span>Total:</span>
                                    <span>{modelTokens.toLocaleString('en-US')}</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                                  💡 I/O: {(modelInputTokens + modelOutputTokens).toLocaleString('en-US')} | Cache Write: {modelInputWithCache.toLocaleString('en-US')} | Cache Read: {modelCacheRead.toLocaleString('en-US')}
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          ${modelCostsUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          {formatCurrency(modelCostsUserCurrency, userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                          ${costPerMillionTokens.toFixed(2)}
                        </td>
                        
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-700/50 font-semibold">
                  <td className="py-3 px-3 text-gray-900 dark:text-white">Total</td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {getFilteredData().reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        return sum + usage.tokenBreakdown.inputWithCacheWrite + usage.tokenBreakdown.inputWithoutCacheWrite
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {getFilteredData().reduce((sum, usage) => {
                      if (usage.tokenBreakdown) {
                        return sum + usage.tokenBreakdown.output
                      }
                      return sum
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {getFilteredData().reduce((sum, usage) => sum + (usage.tokens || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    ${getFilteredData().reduce((sum, usage) => sum + (usage.costUsd || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(convertFromUSD(getFilteredData().reduce((sum, usage) => sum + (usage.costUsd || 0), 0)), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-900 dark:text-white">
                    ${(() => {
                      const totalTokens = getFilteredData().reduce((sum, usage) => sum + (usage.tokens || 0), 0)
                      const totalCosts = getFilteredData().reduce((sum, usage) => sum + (usage.costUsd || 0), 0)
                      return totalTokens > 0 ? ((totalCosts / totalTokens) * 1000000).toFixed(2) : '0.00'
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
                {getFilteredData().reduce((sum, usage) => sum + (usage.tokens || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                ${getFilteredData().reduce((sum, usage) => sum + (usage.costUsd || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {chartData.filter(d => allModels.some(model => (d[model] as number) > 0)).length} active {aggregationMode}s
                {zoomRange && <span className="text-secondary-600 dark:text-secondary-400"> • Zoomed</span>}
              </div>
            </div>
          </div>

          {/* Models Used Card */}
          <div className="bg-white dark:bg-gray-700 border-2 border-secondary-300 dark:border-gray-600 rounded-lg p-3 shadow-sm transition-colors duration-200">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-secondary-800 dark:text-gray-200">Models Used</h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {allModels.filter(model => {
                  // Only count models that have data in the current chart view
                  return getFilteredData().some(u => u.model === model)
                }).length}
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
                  <svg className="w-3 h-3 text-secondary-600 dark:text-gray-400 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </h4>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(convertFromUSD(getFilteredData().reduce((sum, usage) => sum + (usage.costUsd || 0), 0)), userCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Source Band - Fueld Midnight Green (hidden in UI, shown in copy) */}
      <div className="source-band bg-secondary-800 text-white py-3 px-6 -mx-6 -mb-6 mt-4 hidden" style={{ borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}>
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <img src="/logos/fueld-logo-symbol-white.svg" alt="Fueld" className="w-5 h-5" />
            <span className="text-sm font-medium">Chart generated by</span>
            <a 
              href="https://cursorcosts.fueld.ai/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-primary-300 font-semibold underline transition-colors"
            >
              cursorcosts.fueld.ai
            </a>
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
              <div className="font-medium">Data pasting and uploading</div>
              <div className="text-sm text-gray-500">Please wait...</div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
} 