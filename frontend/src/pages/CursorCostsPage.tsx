import { useEffect, useState, useRef } from 'react'
// import { useNavigate } from 'react-router-dom' // Not currently used
import { useAuth } from '../contexts/AuthContext'
// import { useOrganization } from '../contexts/OrganizationContext' // Not currently used
import { useTheme } from '../contexts/ThemeContext'
import { useUserUsageData } from '../hooks/useUserUsageData'
import CSVImport from '@/components/CSVImport'
import CursorUsageChart from '@/components/CursorUsageChart'
import AuthModal from '@/components/AuthModal'
import CurrencySelector from '@/components/CurrencySelector'
import ConfirmationModal from '@/components/ConfirmationModal'
import AdminPage from './AdminPage'
import AboutModal from '@/components/AboutModal'
import { useCurrency } from '../hooks/useCurrency'
import { CursorUsageV2, CursorUsageImportSummary } from '@shared'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebaseApp'
import { getUserAnySavedUsageV2 } from '@/lib/usageEvents'

const usageRowMergeKey = (row: CursorUsageV2): string => {
  const tb = row.tokenBreakdown
  return [
    String(row.timestamp),
    String(row.model || ''),
    String(row.expandedModelName || ''),
    String(row.source || ''),
    String(row.tokens || 0),
    String(row.costUsd ?? ''),
    String(tb?.inputWithCacheWrite ?? ''),
    String(tb?.inputWithoutCacheWrite ?? ''),
    String(tb?.cacheRead ?? ''),
    String(tb?.output ?? ''),
    String(tb?.total ?? ''),
  ].join('|')
}


export default function CursorCostsPage() {
  // const navigate = useNavigate() // Commented out - not currently used
  const { currentUser } = useAuth()
  // const { organization } = useOrganization() // Commented out - not currently used
  const { actualTheme } = useTheme()
  const { 
    loading, 
    error, 
    clearError 
  } = useUserUsageData()
  const {  userCurrency, loading: currencyLoading } = useCurrency()
  
  type MappingImportDiagnostics = {
    source: string
    rowsEvaluated: number
    matchedRows: number
    unmatchedRows: number
    matchTypeCounts: Record<string, number>
    unmatchedModels: Array<{
      rawModelName: string
      canonicalSuggestion: string
      source: string
      occurrences: number
    }>
  }

  type SaveResultState = {
    saved: number
    duplicates: number
    errors: string[]
    mappingDiagnostics?: MappingImportDiagnostics
  }

  const mergeMappingDiagnostics = (
    base: MappingImportDiagnostics,
    next: MappingImportDiagnostics
  ): MappingImportDiagnostics => {
    const mergedCounts: Record<string, number> = { ...base.matchTypeCounts }
    Object.entries(next.matchTypeCounts || {}).forEach(([k, v]) => {
      mergedCounts[k] = (mergedCounts[k] || 0) + Number(v || 0)
    })

    const unmatchedMap = new Map<string, {
      rawModelName: string
      canonicalSuggestion: string
      source: string
      occurrences: number
    }>()
    for (const item of [...(base.unmatchedModels || []), ...(next.unmatchedModels || [])]) {
      const key = `${item.source}|${item.rawModelName}|${item.canonicalSuggestion}`
      const prev = unmatchedMap.get(key)
      if (prev) {
        prev.occurrences += Number(item.occurrences || 0)
      } else {
        unmatchedMap.set(key, {
          ...item,
          occurrences: Number(item.occurrences || 0),
        })
      }
    }

    return {
      source: base.source || next.source,
      rowsEvaluated: Number(base.rowsEvaluated || 0) + Number(next.rowsEvaluated || 0),
      matchedRows: Number(base.matchedRows || 0) + Number(next.matchedRows || 0),
      unmatchedRows: Number(base.unmatchedRows || 0) + Number(next.unmatchedRows || 0),
      matchTypeCounts: mergedCounts,
      unmatchedModels: Array.from(unmatchedMap.values())
        .sort((a, b) => b.occurrences - a.occurrences || a.rawModelName.localeCompare(b.rawModelName))
        .slice(0, 25),
    }
  }

  // Debug currency state
  console.log('🎯 CursorCostsPage - userCurrency:', userCurrency, 'loading:', currencyLoading, 'currentUser:', !!currentUser)
  
  // const [tempData, setTempData] = useState<CursorUsage[]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [isPasting] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResultState | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode] = useState<'login' | 'signup'>('login')
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const [currentPage, setCurrentPage] = useState<'main' | 'admin'>('main')
  const [showAboutModal, setShowAboutModal] = useState(false)
  const isSuperAdmin = Boolean(
    currentUser?.email && ['glenn@aicoder.guru', 'glenn@fueld.ai'].includes(currentUser.email)
  )

  const [tempDataV2, setTempDataV2] = useState<CursorUsageV2[]>([])
  const [isSavingUsageEvents, setIsSavingUsageEvents] = useState(false)
  const [isLoadingSavedEvents, setIsLoadingSavedEvents] = useState(false)
  const [loadedSource, setLoadedSource] = useState<string | null>(null)

  // Show the uploaded tokens data immediately for both guests and logged-in users
  const displayDataV2 = tempDataV2

  // State for Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalProps, setConfirmModalProps] = useState<{
    title: string
    message: string
    onConfirm: () => void
    confirmText?: string
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  })

  // Check if user is admin
  // const isAdmin = currentUser && currentUser.email === 'glenn@fueld.ai' // Commented out - not currently used

  // Function to handle Paste Data click - scrolls to import section and triggers paste
  const importSectionRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);





  const loadSavedEvents = async () => {
    if (!currentUser?.uid) return
    try {
      setIsLoadingSavedEvents(true)
      // Prefer canonical `usageEvents`, but fall back to legacy collections if that's where the data lives.
      // First, load a small sample to determine the latest timestamp and the source.
      const latest = await getUserAnySavedUsageV2(currentUser.uid, { limitCount: 1 })
      setLoadedSource(latest.source)
      if (latest.rows.length === 0) return

      const latestMs = typeof latest.rows[0]?.timestamp === 'number' ? latest.rows[0].timestamp : Date.now()
      const days = 365
      const startMs = latestMs - days * 24 * 60 * 60 * 1000

      const full = await getUserAnySavedUsageV2(currentUser.uid, { startMs, limitCount: 10000 })
      setLoadedSource(full.source)
      if (full.rows.length > 0) {
        setTempDataV2(full.rows)
      }
    } catch (e) {
      console.error('Failed to load saved usage events:', e)
      // Surface a user-friendly message (often permissions/rules-related).
      setPasteError('Could not load your saved usage yet. If this persists, refresh the page.')
    } finally {
      setIsLoadingSavedEvents(false)
    }
  }

  // Initial load from saved data for authenticated users
  // (keeps charts persistent across refreshes/sessions)
  useEffect(() => {
    if (currentUser?.uid) {
      void loadSavedEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid])

  // New: handle tokens-based Cursor CSV import (tokens-only flow)
const handleTokensImport = async (
  rows: CursorUsageV2[],
  summary: CursorUsageImportSummary,
  fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
) => {
  console.log('🎯 CursorCostsPage: handleTokensImport called with', rows.length, 'rows and summary:', summary)
  console.log('🎯 CursorCostsPage: First few rows:', rows.slice(0, 3))

  // Merge new CSV rows into existing data so previously-loaded Firestore records
  // remain visible while the background ingestion runs. Deduplicate by fingerprint
  // (timestamp + model + tokens) to avoid double-counting.
  setTempDataV2((prev) => {
    if (prev.length === 0) return rows

    const existing = new Map<string, CursorUsageV2>()
    for (const r of prev) {
      const key = usageRowMergeKey(r)
      existing.set(key, r)
    }
    // New rows overwrite existing duplicates (fresher parse)
    for (const r of rows) {
      const key = usageRowMergeKey(r)
      existing.set(key, r)
    }
    const merged = Array.from(existing.values())
    merged.sort((a, b) => a.timestamp - b.timestamp)
    return merged
  })
  
  if (currentUser) {
    try {
      console.log('👤 CursorCostsPage: User is logged in, ingesting usage events...')
      setSaveResult(null)
      clearError()
      setPasteError(null)
      setIsSavingUsageEvents(true)

      const importId = `cursor_csv_${Date.now()}`
      const ingest = httpsCallable(functions, 'ingestUsageEventsFromCursorCsv')

      // Chunk to avoid callable payload limits
      const chunkSize = 2000
      let saved = 0
      let duplicates = 0
      const errors: string[] = []
      let mappingDiagnostics: MappingImportDiagnostics | null = null

      // Run the save in the background; do not block the UI thread.
      void (async () => {
        try {
          const batches = (fileBatches && fileBatches.length > 0)
            ? fileBatches
            : [{ fileName: 'cursor.csv', fileHash: '', rows }]

          for (const batch of batches) {
            // Send newest rows first so the most recent (likely unique) data is
            // persisted even if later chunks hit a timeout or transient error.
            // Rows are sorted ascending, so we chunk from the end backwards.
            const total = batch.rows.length
            for (let end = total; end > 0; end -= chunkSize) {
              const start = Math.max(0, end - chunkSize)
              const chunk = batch.rows.slice(start, end)

              const result = await ingest({
                importId,
                fileName: batch.fileName,
                ...(batch.fileHash ? { fileHash: batch.fileHash } : {}),
                rows: chunk,
              })

              const data = result.data as any
              saved += Number(data?.saved || 0)
              duplicates += Number(data?.duplicates || 0)
              if (data?.mappingDiagnostics) {
                const incoming = data.mappingDiagnostics as MappingImportDiagnostics
                mappingDiagnostics = mappingDiagnostics
                  ? mergeMappingDiagnostics(mappingDiagnostics, incoming)
                  : incoming
              }
            }
          }

          setSaveResult({ saved, duplicates, errors, ...(mappingDiagnostics ? { mappingDiagnostics } : {}) })
          // Refresh the UI from Firestore so we are charting persisted stitched data.
          await loadSavedEvents()
        } catch (e: any) {
          console.error('Failed to ingest usage events:', e)
          setPasteError(e?.message || 'Failed to save your usage data. Please try again.')
        } finally {
          setIsSavingUsageEvents(false)
        }
      })()
    } catch (e: any) {
      console.error('Failed to ingest usage events:', e)
      setPasteError(e?.message || 'Failed to save your usage data. Please try again.')
      setIsSavingUsageEvents(false)
    }
  } else {
    console.log('👤 CursorCostsPage: User is guest, setting temp data for display')
  }
  
  console.log('✅ CursorCostsPage: tempDataV2 state updated, should trigger re-render')
}

  // New: handle Claude Code usage import via ccusage JSON (daily report)
  const handleCcusageDailyImport = async (
    rows: CursorUsageV2[],
    summary: CursorUsageImportSummary,
    fileBatches?: Array<{ fileName: string; fileHash: string; rows: CursorUsageV2[] }>
  ) => {
    console.log('🎯 CursorCostsPage: handleCcusageDailyImport called with', rows.length, 'rows and summary:', summary)

    // Merge new rows into existing data (same logic as handleTokensImport)
    setTempDataV2((prev) => {
      if (prev.length === 0) return rows

      const existing = new Map<string, CursorUsageV2>()
      for (const r of prev) {
        const key = usageRowMergeKey(r)
        existing.set(key, r)
      }
      for (const r of rows) {
        const key = usageRowMergeKey(r)
        existing.set(key, r)
      }
      const merged = Array.from(existing.values())
      merged.sort((a, b) => a.timestamp - b.timestamp)
      return merged
    })

    if (!currentUser) return

    try {
      setSaveResult(null)
      clearError()
      setPasteError(null)
      setIsSavingUsageEvents(true)

      const importId = `ccusage_daily_${Date.now()}`
      const ingest = httpsCallable(functions, 'ingestUsageEventsFromCcusageDailyJson')
      const chunkSize = 2000

      let saved = 0
      let duplicates = 0
      const errors: string[] = []
      let mappingDiagnostics: MappingImportDiagnostics | null = null

      void (async () => {
        try {
          const batches = (fileBatches && fileBatches.length > 0)
            ? fileBatches
            : [{ fileName: 'ccusage.json', fileHash: '', rows }]

          for (const batch of batches) {
            // Newest rows first (same rationale as cursor CSV import)
            const total = batch.rows.length
            for (let end = total; end > 0; end -= chunkSize) {
              const start = Math.max(0, end - chunkSize)
              const chunk = batch.rows.slice(start, end)

              const result = await ingest({
                importId,
                fileName: batch.fileName,
                ...(batch.fileHash ? { fileHash: batch.fileHash } : {}),
                rows: chunk,
              })
              const data = result.data as any
              saved += Number(data?.saved || 0)
              duplicates += Number(data?.duplicates || 0)
              if (data?.mappingDiagnostics) {
                const incoming = data.mappingDiagnostics as MappingImportDiagnostics
                mappingDiagnostics = mappingDiagnostics
                  ? mergeMappingDiagnostics(mappingDiagnostics, incoming)
                  : incoming
              }
            }
          }

          setSaveResult({ saved, duplicates, errors, ...(mappingDiagnostics ? { mappingDiagnostics } : {}) })
          await loadSavedEvents()
        } catch (e: any) {
          console.error('Failed to ingest ccusage daily usage events:', e)
          setPasteError(e?.message || 'Failed to save your Claude Code usage data. Please try again.')
        } finally {
          setIsSavingUsageEvents(false)
        }
      })()
    } catch (e: any) {
      console.error('Failed to ingest ccusage daily usage events:', e)
      setPasteError(e?.message || 'Failed to save your Claude Code usage data. Please try again.')
      setIsSavingUsageEvents(false)
    }
  }

  const handleClear = () => {
    if (currentUser) {
      setConfirmModalProps({
        title: 'Confirm Clear View',
        message: 'This will clear records in the table and chart and reset the view for a new data paste.\n\nYour saved data in the backend will NOT be affected.',
        onConfirm: () => {
          setSaveResult(null) // Clear any previous save/import messages
          clearError() // Clear any error messages
        },
        confirmText: 'Proceed',
      })
    } else {
      setConfirmModalProps({
        title: 'Confirm Clear Data',
        message: 'Are you sure you want to clear the currently displayed data from the table and chart?\n\nThis action cannot be undone for the current session.',
        onConfirm: () => {
          clearError()
        },
        confirmText: 'Clear Data',
      })
    }
    setShowConfirmModal(true)
  }

  // Removed - navigate to /login instead
  // const openAuthModal = (_mode: 'login' | 'signup') => {
  //   // Navigate to login page instead
  // }

  // CSV Download Functions
  /*
  const convertToCSV = (data: CursorUsage[]): string => {
    if (data.length === 0) return ''

    // CSV headers
    const headers = ['Date', 'Model', 'Status', 'Requests', 'Cost Per Request (USD)', 'Total Cost (USD)', `Total Cost (${userCurrency})`]
    
    // CSV rows
    const rows = data.map(usage => [
      usage.date,
      usage.model,
      usage.status,
      usage.requests.toString(),
      usage.costPerRequest.toFixed(4),
      usage.totalCost.toFixed(4),
      convertFromUSD(usage.totalCost).toFixed(4)
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    return csvContent
  }

  const downloadCSV = () => {
    const csvContent = convertToCSV(displayData)
    if (!csvContent) return

    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')
    const filename = `cursor-costs-${timestamp}.csv`

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  // const summary = calculateSummary(displayData)
  */



  // Render admin page if selected
  if (currentPage === 'admin') {
    return <AdminPage onBackToMain={() => setCurrentPage('main')} />
  }

  // About modal is now rendered at the bottom of the component

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-secondary-800 text-neutral-900 dark:text-gray-100 transition-colors duration-200">
      {/* Hero Section */}
      <div className="bg-gray-50 dark:bg-secondary-800 transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-10">
          <div className="">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
              <p className="text-xl text-neutral-900 dark:text-white/90 text-left max-w-3xl">
                Measure. Motivate. Master AI.
              </p>

              {/* AICoder.Guru Logo - conditional based on theme */}
              <img
                src={actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
                alt="AICoder.Guru - Measure. Motivate. Master AI."
                className="h-12 transition-opacity hover:opacity-90"
              />
            </div>
          </div>
        </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
        

        {/* Stats Cards removed per latest UX – now moved to chart footer */}

        {/* Daily Usage Chart */}
        {currentUser && isLoadingSavedEvents && displayDataV2.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Checking for saved usage…
              </div>
            </div>
            <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
              If data exists, your chart will appear automatically.
            </div>
          </div>
        )}
        {displayDataV2.length > 0 && (
          <div ref={chartRef}>
            <CursorUsageChart data={displayDataV2} isLoading={isPasting || isLoadingSavedEvents} />
          </div>
        )}

        {/* Error Display */}
        {(error || pasteError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 mt-6 relative z-10 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <div>
                  {error && <p className="text-red-700 dark:text-red-300">{error}</p>}
                  {pasteError && <p className="text-red-700 dark:text-red-300">{pasteError}</p>}
                </div>
              </div>
              <button
                onClick={() => {
                  clearError()
                  setPasteError(null)
                }}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Save Result Display */}
        {saveResult && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 mt-6 relative z-10 transition-colors duration-200">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <div>
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Import completed: {saveResult.saved} new entries saved
                </p>
                {saveResult.duplicates > 0 && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    {saveResult.duplicates} duplicates skipped
                  </p>
                )}
                {saveResult.errors.length > 0 && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                    {saveResult.errors.length} errors occurred
                  </p>
                )}
                {saveResult.mappingDiagnostics && (
                  <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                    Mapping diagnostics: {saveResult.mappingDiagnostics.matchedRows.toLocaleString()} seed matches,{' '}
                    {saveResult.mappingDiagnostics.unmatchedRows.toLocaleString()} heuristic matches.
                  </p>
                )}
                {currentUser && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    💾 Raw data preserved • 📊 Auto-aggregated by minute for analytics
                  </p>
                )}
                {isSuperAdmin && saveResult.mappingDiagnostics && saveResult.mappingDiagnostics.unmatchedModels.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                      Unmatched model aliases detected (top {Math.min(8, saveResult.mappingDiagnostics.unmatchedModels.length)}):
                    </p>
                    <div className="mt-1 space-y-1">
                      {saveResult.mappingDiagnostics.unmatchedModels.slice(0, 8).map((item) => (
                        <p key={`${item.source}|${item.rawModelName}|${item.canonicalSuggestion}`} className="text-amber-700 dark:text-amber-300 text-xs">
                          {item.source}: `{item.rawModelName}` → `{item.canonicalSuggestion}` ({item.occurrences})
                        </p>
                      ))}
                    </div>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-2">
                      Super-admin alert email sent automatically for this import.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

       

        {/* Import Section */}
        <div ref={importSectionRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">

          
          <CSVImport 
            onTokensImport={handleTokensImport}
            onCcusageDailyImport={handleCcusageDailyImport}
            onClear={handleClear}
            hasData={displayDataV2.length > 0}
            disabled={loading || isSavingUsageEvents}
          />
          
          {(loading || isSavingUsageEvents) && (
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center">
                <img
                  src="/logos/jade-guru.svg"
                  alt="AICoder.Guru"
                  className="w-6 h-6 mr-3 animate-pulse"
                />
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mr-2"></div>
              </div>
              <span className="text-neutral-900 dark:text-gray-200">
                {isSavingUsageEvents ? 'Saving to your account...' : (currentUser ? 'Loading your data...' : 'Processing...')}
              </span>
            </div>
          )}

          {isLoadingSavedEvents && !isSavingUsageEvents && (
            <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
              Loading saved usage…
            </div>
          )}

          {/* Lightweight diagnostic to confirm we found saved data and where it came from */}
          {currentUser && !isLoadingSavedEvents && !isSavingUsageEvents && displayDataV2.length === 0 && (
            <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              No saved usage found for this signed-in account{loadedSource ? ` (checked: ${loadedSource}).` : '.'}
            </div>
          )}

        </div>

         {/* Guest Mode Notice - Below Chart */}
         {/* {!currentUser && displayDataV2.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 transition-colors duration-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#0A2E36] dark:bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">ℹ️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0A2E36] dark:text-blue-200">Viewing in Guest Mode</h3>
                <p className="text-[#0A2E36]/80 dark:text-blue-300">
                  Your data is displayed temporarily and will be lost when you refresh the page. 
                  <button 
                    onClick={() => openAuthModal('signup')}
                    className="ml-1 text-[#97D700] hover:text-[#85C200] dark:text-primary-400 dark:hover:text-primary-300 font-semibold underline"
                  >
                    Create a free account
                  </button> to save your settings.
                </p>
              </div>
            </div>
          </div>
        )} */}

       

      

    


      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {/* Account Settings Modal - Removed */}

      {/* Currency Selector */}
      <CurrencySelector
        isOpen={showCurrencySelector}
        onClose={() => setShowCurrencySelector(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        onConfirm={confirmModalProps.onConfirm}
        confirmText={confirmModalProps.confirmText}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </div>
  </div>
  )
} 