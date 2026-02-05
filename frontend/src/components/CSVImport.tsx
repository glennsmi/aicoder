import { useState } from 'react'
import { CursorUsageV2, CursorUsageImportSummary } from '@shared'
import CSVDragDrop from './CSVDragDrop'
import CcusageJsonDrop from './CcusageJsonDrop'

interface CSVImportProps {
  onClear?: () => void
  hasData?: boolean
  disabled?: boolean
  onTokensImport?: (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => void
  onCcusageDailyImport?: (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => void
}

export default function CSVImport({
  onClear: _onClear,
  hasData: _hasData,
  disabled = false,
  onTokensImport,
  onCcusageDailyImport,
}: CSVImportProps) {
  const [error, _setError] = useState<string | null>(null)

  // Paste functionality removed – CSV upload is the primary input path now

  const handleTokensImport = (
    data: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => {
    console.log('📤 CSVImport: handleTokensImport called with', data.length, 'rows and summary:', summary)
    if (onTokensImport) {
      console.log('✅ CSVImport: Calling onTokensImport prop')
      onTokensImport(data, summary, fileBatches)
    } else {
      console.log('❌ CSVImport: onTokensImport prop not provided')
    }
  }

  return (
    <>
      {/* Cursor CSV Drag & Drop */}
      <div className="mb-6">
        <CSVDragDrop
          disabled={disabled}
          onImport={(data, summary, fileBatches) => {
            console.log('📤 CSVImport: CSVDragDrop onImport called with', data.length, 'rows')
            handleTokensImport(data, summary, fileBatches)
          }}
        />
      </div>

      {/* Claude Code (ccusage) JSON */}
      <div className="mb-4">
        <CcusageJsonDrop
          disabled={disabled}
          onImport={(data, summary, fileBatches) => {
            console.log('📤 CSVImport: CcusageJsonDrop onImport called with', data.length, 'rows')
            if (onCcusageDailyImport) {
              onCcusageDailyImport(data, summary, fileBatches)
            }
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