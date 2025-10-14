import { useState } from 'react'
import { CursorUsage } from '@shared'

interface CursorCostsChartProps {
  data: CursorUsage[]
}

interface AggregatedData {
  label: string
  fullDate: Date
  models: { [model: string]: number }
  total: number
}

export default function CursorCostsChart({ data }: CursorCostsChartProps) {
  const [aggregationMode, setAggregationMode] = useState<'day' | 'hour'>('day')

  // Parse the date format "May 24, 2025, 01:50 PM" more robustly
  const parseDateTime = (dateStr: string): Date => {
    try {
      console.log('Parsing date:', dateStr)
      
      // Handle the specific format "May 24, 2025, 01:50 PM"
      // The native Date constructor should handle this format correctly
      const parsed = new Date(dateStr)
      
      // Check if the date is valid
      if (isNaN(parsed.getTime())) {
        console.warn('Invalid date parsed:', dateStr)
        return new Date()
      }
      
      console.log('Parsed to:', parsed)
      return parsed
    } catch (error) {
      console.warn('Could not parse date:', dateStr, error)
      return new Date()
    }
  }

  // Generate aggregation key based on mode
  const getAggregationKey = (date: Date, mode: 'day' | 'hour'): string => {
    if (mode === 'day') {
      // Use ISO date string for consistent grouping
      return date.toISOString().split('T')[0] // YYYY-MM-DD
    } else {
      // Include hour for hourly aggregation
      const isoString = date.toISOString()
      return isoString.split(':')[0] // YYYY-MM-DDTHH
    }
  }

  // Get display label for aggregation
  const getDisplayLabel = (date: Date, mode: 'day' | 'hour'): string => {
    if (mode === 'day') {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } else {
      const dayLabel = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
      const hourLabel = date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true
      })
      return `${dayLabel} ${hourLabel}`
    }
  }

  // Group data by the selected aggregation mode
  const groupedData = data.reduce((acc, usage) => {
    const fullDate = parseDateTime(usage.date)
    const key = getAggregationKey(fullDate, aggregationMode)
    
    console.log(`Grouping: ${usage.date} -> ${key} (${usage.model}: ${usage.requests})`)
    
    if (!acc[key]) {
      acc[key] = { models: {}, fullDate }
    }
    if (!acc[key].models[usage.model]) {
      acc[key].models[usage.model] = 0
    }
    acc[key].models[usage.model] += usage.requests
    return acc
  }, {} as { [key: string]: { models: { [model: string]: number }, fullDate: Date } })

  console.log('Grouped data:', groupedData)

  // Convert to array and calculate totals
  const aggregatedData: AggregatedData[] = Object.entries(groupedData)
    .map(([_, { models, fullDate }]) => ({
      label: getDisplayLabel(fullDate, aggregationMode),
      fullDate,
      models,
      total: Object.values(models).reduce((sum, requests) => sum + requests, 0)
    }))
    .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())

  console.log('Aggregated data:', aggregatedData)

  // Get all unique models and assign colors
  const allModels = Array.from(new Set(data.map(usage => usage.model)))
  console.log('All models:', allModels)
  
  const modelColors = {
    'claude-4-sonnet-thinking': '#8b5cf6', // violet-500
    'gemini-2.5-pro-preview-05-08': '#10b981', // green-500
    'default': '#f59e0b', // amber-500
    'gpt-4': '#10b981', // green-500
    'gpt-4-turbo': '#06b6d4', // cyan-500
    'claude-3-5-sonnet': '#8b5cf6', // violet-500
    'claude-3-opus': '#f59e0b', // amber-500
    'claude-3-haiku': '#ef4444', // red-500
    'claude-3-sonnet': '#ec4899', // pink-500
    'gemini-pro': '#6366f1', // indigo-500
    'o1-preview': '#14b8a6', // teal-500
    'o1-mini': '#f97316', // orange-500
  } as { [key: string]: string }

  // Assign colors to models (fallback to generated colors if not predefined)
  const getModelColor = (model: string, index: number) => {
    if (modelColors[model]) return modelColors[model]
    
    // Generate colors for unknown models
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1']
    return colors[index % colors.length]
  }

  const maxTotal = Math.max(...aggregatedData.map(d => d.total))

  if (aggregatedData.length === 0) {
    console.log('No aggregated data to display')
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {aggregationMode === 'day' ? 'Daily' : 'Hourly'} Tokens by Model
          </h3>
          <p className="text-sm text-gray-600">
            Tokens per {aggregationMode}, segmented by AI model
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Aggregation Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAggregationMode('day')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                aggregationMode === 'day'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setAggregationMode('hour')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                aggregationMode === 'hour'
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hourly
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 max-w-md ">
            {allModels.map((model, index) => (
              <div key={model} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getModelColor(model, index) }}
                ></div>
                <span className="text-xs font-medium text-gray-700">{model}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
        <strong>Debug:</strong> {aggregatedData.length} periods, {allModels.length} models
        {aggregatedData.slice(0, 2).map(item => (
          <div key={item.label}>
            {item.label}: {Object.entries(item.models).map(([model, count]) => `${model}(${count})`).join(', ')}
          </div>
        ))}
      </div>

      {/* Vertical Bar Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500 -ml-8">
          <span>{maxTotal.toFixed(0)}</span>
          <span>{(maxTotal * 0.75).toFixed(0)}</span>
          <span>{(maxTotal * 0.5).toFixed(0)}</span>
          <span>{(maxTotal * 0.25).toFixed(0)}</span>
          <span>0</span>
        </div>

        {/* Chart container */}
        <div className="ml-8 border-l border-b border-gray-200 h-64 relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <div
                key={fraction}
                className="absolute w-full border-t border-gray-100"
                style={{ bottom: `${fraction * 100}%` }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end justify-around px-4">
            {aggregatedData.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex flex-col items-center group"
                style={{ width: `${Math.max(100 / aggregatedData.length - 2, 15)}%` }}
              >
                {/* Stacked Bar */}
                <div
                  className="w-full rounded-t-sm overflow-hidden shadow-sm relative flex flex-col-reverse"
                  style={{ height: `${(item.total / maxTotal) * 100}%` }}
                >
                  {/* Stack segments from bottom to top using flex-col-reverse */}
                  {Object.entries(item.models).map(([model, requests], _) => {
                    const heightPercentage = (requests / item.total) * 100
                    const modelColorIndex = allModels.indexOf(model)
                    
                    return (
                      <div
                        key={model}
                        className="w-full transition-all duration-300 hover:opacity-80 relative group flex-shrink-0"
                        style={{
                          height: `${heightPercentage}%`,
                          backgroundColor: getModelColor(model, modelColorIndex)
                        }}
                        title={`${model}: ${requests.toFixed(1)} tokens`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {model}: {requests.toFixed(1)} tokens
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Label */}
                <div className="mt-2 text-xs font-medium text-gray-600 transform -rotate-45 origin-center whitespace-nowrap">
                  {item.label}
                </div>

                {/* Total label on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                  Total: {item.total.toFixed(1)} tokens
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Total Requests: {data.reduce((sum, usage) => sum + usage.requests, 0).toFixed(1)} 
            <span className="ml-2 text-gray-400">
              ({aggregatedData.length} {aggregationMode}s)
            </span>
          </span>
          <span>Total Cost: ${(data.reduce((sum, usage) => sum + usage.totalCost, 0)).toFixed(3)}</span>
        </div>
      </div>
    </div>
  )
} 