import { useState } from 'react'
import { CursorUsageV2, CursorUsageImportSummary } from '@shared'
import CSVDragDrop from './CSVDragDrop'

interface CSVImportProps {
  onClear?: () => void
  hasData?: boolean
  disabled?: boolean
  onTokensImport?: (data: CursorUsageV2[], summary: CursorUsageImportSummary) => void
}

export default function CSVImport({ onClear: _onClear, hasData: _hasData, disabled = false, onTokensImport }: CSVImportProps) {
  const [error, _setError] = useState<string | null>(null)

  // Paste functionality removed – CSV upload is the primary input path now

  const handleTokensImport = (data: CursorUsageV2[], summary: CursorUsageImportSummary) => {
    console.log('📤 CSVImport: handleTokensImport called with', data.length, 'rows and summary:', summary)
    if (onTokensImport) {
      console.log('✅ CSVImport: Calling onTokensImport prop')
      onTokensImport(data, summary)
    } else {
      console.log('❌ CSVImport: onTokensImport prop not provided')
    }
  }

  return (
    <>
      {/* Upload CSV */}


      {/* CSV Drag & Drop */}
      <div className="mb-4">
        <CSVDragDrop
          disabled={disabled}
          onImport={(data, summary) => {
            console.log('📤 CSVImport: CSVDragDrop onImport called with', data.length, 'rows')
            handleTokensImport(data, summary)
          }}
        />
      </div>

      {/* Secondary Actions and Error */}
      <div className="text-center">
        {error && (
          <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Success banner removed in CSV-only flow */}
      </div>
    </>
  )
} 