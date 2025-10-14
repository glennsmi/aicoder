import { useState } from 'react'
import { EnhancedCursorUsage } from '@shared'
import { parseEnhancedDateTime } from '../lib/enhancedFirestore'

interface EnhancedCSVImportProps {
  onDataImport: (data: EnhancedCursorUsage[]) => void
  onClear: () => void
  hasData: boolean
  disabled?: boolean
}

export default function EnhancedCSVImport({ onDataImport, onClear, hasData, disabled = false }: EnhancedCSVImportProps) {
  const [csvText, setCsvText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<EnhancedCursorUsage[]>([])

  // Parse the enhanced CSV data format
  const parseEnhancedCSVData = (csvText: string): EnhancedCursorUsage[] => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length === 0) {
        throw new Error('No data found')
      }

      const parsedData: EnhancedCursorUsage[] = []
      let currentEntry: Partial<EnhancedCursorUsage> = {}
      let tokenUsageSection = false
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Check if this line contains the main entry data. The billing type now varies (e.g. "Usage-based", "Included in Pro").
        // We therefore capture whatever text appears between the user name and the success column.
        // Example lines:
        //   "May 31, 09:53 AM\tYou\tUsage-based\tYes\tclaude-4-sonnet-thinking"
        //   "Jun 14, 10:47 PM\tYou\tIncluded in Pro\tYes\to3\t1.4"
        let mainEntryMatch = line.match(/^(.+?\d{2}:\d{2}\s(?:AM|PM))\s+([^\t]+?)\s+([^\t]+?)\s+(Yes|No)\s+(.+?)(?:\s+(\d+(?:\.\d+)?)\s*)?$/)
        
        // Fallback: if the regex did not match (for instance because the source data is tab-delimited with multiple consecutive tabs),
        // try a simple tab split which is more forgiving.
        let parts: string[] = []
        if (!mainEntryMatch) {
          parts = line.split(/\t+/).map(p => p.trim()).filter(Boolean)
          // Expected order after split: [date, user, billingType, success, model, requests?]
          if (parts.length >= 5 && /^(Yes|No)$/i.test(parts[3])) {
            const [datePart, userPart, billingPart, successPart, modelPart, requestsPart] = parts
            mainEntryMatch = [
              '',           // full match placeholder (unused)
              datePart,
              userPart,
              billingPart,
              successPart,
              modelPart,
              requestsPart ?? undefined,
            ] as unknown as RegExpMatchArray
          }
        }
        
        if (mainEntryMatch) {
          // Save previous entry if exists
          if (currentEntry.date && currentEntry.model) {
            // Finalize the previous entry
            const finalEntry = {
              date: currentEntry.date,
              user: currentEntry.user || 'You',
              billingType: currentEntry.billingType || 'Usage-based',
              success: currentEntry.success || 'Yes',
              model: currentEntry.model,
              requests: currentEntry.requests || 0,
              tokenUsage: currentEntry.tokenUsage || {
                input: 0,
                output: 0,
                cacheWrite: 0,
                cacheRead: 0
              },
              totalCost: currentEntry.totalCost || 0,
              costPerRequest: currentEntry.requests ? (currentEntry.totalCost || 0) / currentEntry.requests : 0,
              parsedDate: parseEnhancedDateTime(currentEntry.date)
            }
            
            parsedData.push(finalEntry)
          }
          
          // Start new entry
          currentEntry = {
            date: mainEntryMatch[1].trim(),
            user: mainEntryMatch[2].trim(),
            billingType: mainEntryMatch[3].trim(),
            success: mainEntryMatch[4].trim(),
            model: mainEntryMatch[5].trim(),
            requests: mainEntryMatch[6] !== undefined ? parseFloat(mainEntryMatch[6]) : undefined,
            tokenUsage: {
              input: 0,
              output: 0,
              cacheWrite: 0,
              cacheRead: 0
            },
            totalCost: 0
          }
          
          tokenUsageSection = false
          continue
        }
        
        // Check for requests line (number only)
        if (/^\d+(?:\.\d+)?$/.test(line) && currentEntry.date && currentEntry.requests === undefined) {
          currentEntry.requests = parseFloat(line)
          continue
        }
        
        // Check for "Token Usage:" line
        if (line === 'Token Usage:') {
          tokenUsageSection = true
          continue
        }
        
        // Parse token usage lines
        if (tokenUsageSection && currentEntry.tokenUsage) {
          const inputMatch = line.match(/^Input:\s*(\d+)\s*tokens?$/)
          if (inputMatch) {
            currentEntry.tokenUsage.input = parseInt(inputMatch[1])
            continue
          }
          
          const outputMatch = line.match(/^Output:\s*(\d+)\s*tokens?$/)
          if (outputMatch) {
            currentEntry.tokenUsage.output = parseInt(outputMatch[1])
            continue
          }
          
          const cacheWriteMatch = line.match(/^Cache Write:\s*(\d+)\s*tokens?$/)
          if (cacheWriteMatch) {
            currentEntry.tokenUsage.cacheWrite = parseInt(cacheWriteMatch[1])
            continue
          }
          
          const cacheReadMatch = line.match(/^Cache Read:\s*(\d+)\s*tokens?$/)
          if (cacheReadMatch) {
            currentEntry.tokenUsage.cacheRead = parseInt(cacheReadMatch[1])
            continue
          }
          
          const totalMatch = line.match(/^Total:\s*\$(\d+(?:\.\d+)?)$/)
          if (totalMatch) {
            currentEntry.totalCost = parseFloat(totalMatch[1])
            tokenUsageSection = false
            continue
          }
        }
      }
      
      // Don't forget the last entry
      if (currentEntry.date && currentEntry.model) {
        const finalEntry = {
          date: currentEntry.date,
          user: currentEntry.user || 'You',
          billingType: currentEntry.billingType || 'Usage-based',
          success: currentEntry.success || 'Yes',
          model: currentEntry.model,
          requests: currentEntry.requests || 0,
          tokenUsage: currentEntry.tokenUsage || {
            input: 0,
            output: 0,
            cacheWrite: 0,
            cacheRead: 0
          },
          totalCost: currentEntry.totalCost || 0,
          costPerRequest: currentEntry.requests ? (currentEntry.totalCost || 0) / currentEntry.requests : 0,
          parsedDate: parseEnhancedDateTime(currentEntry.date)
        }
        
        parsedData.push(finalEntry)
      }

      console.log('Parsed enhanced data:', parsedData.length, 'entries')
      return parsedData

    } catch (error: any) {
      console.error('Enhanced parsing error:', error)
      throw new Error(`Failed to parse enhanced CSV data: ${error.message}`)
    }
  }

  const handleProcess = async () => {
    if (!csvText.trim()) {
      setError('Please paste some data first')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const data = parseEnhancedCSVData(csvText)
      setPreviewData(data)
      
      if (data.length === 0) {
        throw new Error('No valid data found')
      }

      console.log('Processed enhanced data:', data.length, 'entries')
      
    } catch (err: any) {
      console.error('Enhanced processing error:', err)
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (previewData.length > 0) {
      onDataImport(previewData)
      setCsvText('')
      setPreviewData([])
      setError(null)
    }
  }

  const handleClear = () => {
    setCsvText('')
    setPreviewData([])
    setError(null)
    onClear()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Enhanced Usage Data Import</h3>
      
      {/* Instructions */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to import:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Go to your Cursor usage page and copy the usage data</li>
          <li>Paste the data in the text area below (including token usage details)</li>
          <li>Click "Process Data" to parse and preview</li>
          <li>Review the preview and click "Import Data" to save</li>
        </ol>
      </div>

      {/* Text Area */}
      <div className="mb-4">
        <label htmlFor="enhanced-csv-text" className="block text-sm font-medium text-gray-700 mb-2">
          Paste Enhanced Cursor Usage Data:
        </label>
        <textarea
          id="enhanced-csv-text"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="May 31, 09:53 AM	You	Usage-based	Yes	claude-4-sonnet-thinking
0.7
Token Usage:
Input:
5 tokens
Output:
266 tokens
Cache Write:
3309 tokens
Cache Read:
22469 tokens
Total:
$0.03"
          className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
          disabled={disabled}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Preview */}
      {previewData.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Preview ({previewData.length} entries):</h4>
          <div className="text-sm text-green-800 space-y-2">
            {previewData.slice(0, 3).map((entry, index) => (
              <div key={index} className="bg-white p-2 rounded border">
                <div className="font-medium">{entry.date} - {entry.model}</div>
                <div className="text-xs">
                  Requests: {entry.requests} | Cost: ${entry.totalCost.toFixed(3)} | 
                  Tokens: {entry.tokenUsage.input + entry.tokenUsage.output + entry.tokenUsage.cacheWrite + entry.tokenUsage.cacheRead}
                </div>
              </div>
            ))}
            {previewData.length > 3 && (
              <div className="text-xs text-green-600">...and {previewData.length - 3} more entries</div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleProcess}
          disabled={!csvText.trim() || isProcessing || disabled}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Process Data'}
        </button>
        
        {previewData.length > 0 && (
          <button
            onClick={handleImport}
            disabled={disabled}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Import Data ({previewData.length} entries)
          </button>
        )}
        
        {(csvText.trim() || hasData) && (
          <button
            onClick={handleClear}
            disabled={disabled}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
} 