import { useState, useRef } from 'react'
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
  
  // Debug currency state
  console.log('🎯 CursorCostsPage - userCurrency:', userCurrency, 'loading:', currencyLoading, 'currentUser:', !!currentUser)
  
  // const [tempData, setTempData] = useState<CursorUsage[]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [isPasting] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    saved: number
    duplicates: number
    errors: string[]
  } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode] = useState<'login' | 'signup'>('login')
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const [currentPage, setCurrentPage] = useState<'main' | 'admin'>('main')
  const [showAboutModal, setShowAboutModal] = useState(false)

  const [tempDataV2, setTempDataV2] = useState<CursorUsageV2[]>([])

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





  // New: handle tokens-based CSV import (tokens-only flow)
const handleTokensImport = async (rows: CursorUsageV2[], summary: CursorUsageImportSummary) => {
  console.log('🎯 CursorCostsPage: handleTokensImport called with', rows.length, 'rows and summary:', summary)
  console.log('🎯 CursorCostsPage: First few rows:', rows.slice(0, 3))
  
  if (currentUser) {
    // TODO: once backend updated, save tokens-only rows; for now, just display
    console.log('👤 CursorCostsPage: User is logged in, setting temp data for display')
    setTempDataV2(rows)
  } else {
    console.log('👤 CursorCostsPage: User is guest, setting temp data for display')
    setTempDataV2(rows)
  }
  
  console.log('✅ CursorCostsPage: tempDataV2 state updated, should trigger re-render')
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
      <div className="bg-gray-50 dark:bg-secondary-800 p-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2 -mt-4">
              <div className="flex flex-row items-center justify-between w-full">
                <div className="flex flex-row items-center">
                  {/* AICoder.Guru Logo - conditional based on theme */}
                  <img 
                    src={actualTheme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
                    alt="AICoder.Guru - Measure. Motivate. Master AI."
                    className="h-12 transition-opacity hover:opacity-90"
                  />
                </div>

              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-20 max-w-3xl mx-auto">
              <p className="text-xl text-neutral-900 dark:text-white/90 text-center sm:text-left">
                Professional cost tracking for Cursor AI usage with smart data aggregation and analytics
              </p>
              
            </div>
            
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        

        {/* Stats Cards removed per latest UX – now moved to chart footer */}

        {/* Daily Usage Chart */}
        {displayDataV2.length > 0 && (
          <div ref={chartRef}>
            <CursorUsageChart data={displayDataV2} isLoading={isPasting} />
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
                {currentUser && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    💾 Raw data preserved • 📊 Auto-aggregated by minute for analytics
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

       

        {/* Import Section */}
        <div ref={importSectionRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">

          
          <CSVImport 
            onTokensImport={handleTokensImport}
            onClear={handleClear}
            hasData={displayDataV2.length > 0}
            disabled={loading}
          />
          
          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center">
                <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-6 h-6 mr-3 animate-pulse" />
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mr-2"></div>
              </div>
              <span className="text-neutral-900 dark:text-gray-200">
                {currentUser ? 'Saving to your account...' : 'Processing...'}
              </span>
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