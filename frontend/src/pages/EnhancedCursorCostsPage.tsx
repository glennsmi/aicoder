import { useState, useRef } from 'react'
import { EnhancedCursorUsage } from '@shared'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useEnhancedUserUsageData } from '../hooks/useEnhancedUserUsageData'
// import EnhancedCSVImport from '@/components/EnhancedCSVImport'
// Temporary: chart not available in this build
const EnhancedCursorCostsChart = () => null
import AuthModal from '@/components/AuthModal'
import AccountSettingsModal from '@/components/AccountSettingsModal'
import CurrencySelector from '@/components/CurrencySelector'
import ConfirmationModal from '@/components/ConfirmationModal'
import ThemeToggle from '@/components/ThemeToggle'
import AdminPage from './AdminPage'
import AboutPage from './AboutPage'
import { useCurrency } from '../hooks/useCurrency'

export default function EnhancedCursorCostsPage() {
  const { currentUser } = useAuth()
  const { actualTheme } = useTheme()
  const { 
    usageData, 
    loading, 
    error, 
    stats,
    clearError 
  } = useEnhancedUserUsageData()
  const { formatCurrency, convertFromUSD, userCurrency, loading: currencyLoading } = useCurrency()
  
  console.log('🎯 EnhancedCursorCostsPage - userCurrency:', userCurrency, 'loading:', currencyLoading, 'currentUser:', !!currentUser)
  
  const [tempData] = useState<EnhancedCursorUsage[]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{
    saved: number
    duplicates: number
    errors: string[]
  } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  // const [isTableExpanded, setIsTableExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'about'>('main')

  // State for Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalProps] = useState<{
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
  const isAdmin = currentUser && currentUser.email === 'glenn@fueld.ai'

  // Function to handle Paste Data click - scrolls to import section and triggers paste
  const chartRef = useRef<HTMLDivElement>(null);

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  const closeAuthModal = () => {
    setShowAuthModal(false)
  }

  /* const handleDataImport = async (newData: EnhancedCursorUsage[]) => {
    console.log('📦 Enhanced data import triggered with', newData.length, 'entries')
    
    if (currentUser) {
      // Save to database
      setIsPasting(true)
      setPasteError(null)
      setSaveResult(null)
      
      try {
        const result = await saveUsageData(newData)
        if (result) {
          setSaveResult(result)
          console.log('✅ Enhanced data saved successfully:', result)
        }
      } catch (err: any) {
        console.error('❌ Enhanced save error:', err)
        setPasteError(err.message || 'Failed to save enhanced data')
      } finally {
        setIsPasting(false)
      }
    } else {
      // Guest mode - just display temporarily
      setTempData(newData)
      console.log('👤 Guest mode: Enhanced data stored temporarily')
    }
  } */

  /* const handleClearData = () => {
    setTempData([])
    setPasteError(null)
    setSaveResult(null)
  } */

  // Combine permanent and temporary data
  const displayData = currentUser ? usageData : tempData

  // Convert enhanced data to display format for compatibility with existing components
  const getDisplayMetrics = () => {
    if (displayData.length === 0) return null

    const totalRequests = displayData.reduce((sum, usage) => sum + usage.requests, 0)
    const totalCost = displayData.reduce((sum, usage) => sum + usage.totalCost, 0)
    const totalTokens = displayData.reduce((sum, usage) => 
      sum + usage.tokenUsage.input + usage.tokenUsage.output + usage.tokenUsage.cacheWrite + usage.tokenUsage.cacheRead, 0)
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

    return {
      totalRequests: totalRequests.toFixed(1),
      totalCost: formatCurrency(convertFromUSD(totalCost)),
      totalTokens: totalTokens.toLocaleString(),
      avgCostPerRequest: formatCurrency(convertFromUSD(avgCostPerRequest)),
      entryCount: displayData.length
    }
  }

  const displayMetrics = getDisplayMetrics()

  if (currentPage === 'admin') {
    return <AdminPage onBackToMain={() => setCurrentPage('main')} />
  }

  if (currentPage === 'about') {
    return <AboutPage onBackToMain={() => setCurrentPage('main')} />
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      actualTheme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-secondary-50 via-white to-primary-50 text-gunmetal'
    }`}>
      {/* Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-40">
        <ThemeToggle />
      </div>

      {/* Header */}
      <div className="bg-secondary-800 p-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Fueld Logo Symbol */}
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-10 h-10" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white">Enhanced Cursor Costs Tracker</h1>
                <p className="text-sm text-white/70 mt-1">
                  Track your Cursor AI usage with detailed token analytics - by <a href="https://go.fueld.ai/4kkKxYj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Fueld AI</a>
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-row items-center pt-4 ml-10">
              {/* Auth Buttons for Guests */}
              {!currentUser ? (
                <>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {isAdmin && (
                      <button 
                        onClick={() => setCurrentPage('admin')}
                        className="bg-orange-500/20 text-white px-6 py-2 rounded-xl font-semibold hover:bg-orange-500/30 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 backdrop-blur-sm border border-orange-400/30"
                      >
                        Admin
                      </button>
                    )}
                    <button 
                      onClick={() => setCurrentPage('about')}
                      className="bg-white/10 text-white px-6 py-2 rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 backdrop-blur-sm border border-white/20"
                    >
                      About
                    </button>
                    <a 
                      href="/"
                      className="bg-blue-500/20 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-500/30 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 backdrop-blur-sm border border-blue-400/30 inline-flex items-center"
                    >
                      <span className="mr-2">📊</span>
                      Classic Version
                    </a>
                    <button 
                      onClick={() => openAuthModal('login')}
                      className="bg-white text-gunmetal px-6 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => openAuthModal('signup')}
                      className="bg-primary-500 text-gunmetal px-6 py-2 rounded-xl font-semibold hover:bg-primary-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      Sign Up
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* User Dropdown */}
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <button 
                        onClick={() => setCurrentPage('admin')}
                        className="bg-orange-500/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-500/30 transition-all duration-200 backdrop-blur-sm border border-orange-400/30"
                      >
                        Admin
                      </button>
                    )}
                    <button 
                      onClick={() => setCurrentPage('about')}
                      className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
                    >
                      About
                    </button>
                    <a 
                      href="/"
                      className="bg-blue-500/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500/30 transition-all duration-200 backdrop-blur-sm border border-blue-400/30 inline-flex items-center"
                      title="Switch to classic version"
                    >
                      <span className="mr-2">📊</span>
                      Classic
                    </a>
                    <div className="relative">
                      <button
                        onClick={() => setShowAccountSettings(true)}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200 text-white backdrop-blur-sm border border-white/20"
                      >
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-gunmetal text-sm font-bold">
                          {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
                        </div>
                        <span className="font-medium">{currentUser.displayName || currentUser.email?.split('@')[0]}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guest Mode Notice */}
        {!currentUser && displayData.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 transition-colors duration-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#0A2E36] dark:bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">ℹ️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#0A2E36] dark:text-blue-200">Viewing in Guest Mode</h3>
                <p className="text-[#0A2E36]/80 dark:text-blue-300">
                  Your enhanced data is displayed temporarily and will be lost when you refresh the page. 
                  <button 
                    onClick={() => openAuthModal('signup')}
                    className="ml-1 text-[#97D700] hover:text-[#85C200] dark:text-primary-400 dark:hover:text-primary-300 font-semibold underline"
                  >
                    Create a free account
                  </button> to save your enhanced data permanently and build detailed usage history over time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Import Section */}

        {/* Error Display */}
        {(error || pasteError) && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors duration-200">
            <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Error</h4>
            <p className="text-red-800 dark:text-red-300">{error || pasteError}</p>
            <button 
              onClick={() => {
                clearError()
                setPasteError(null)
              }}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Save Result */}
        {saveResult && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg transition-colors duration-200">
            <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">Enhanced Data Saved Successfully!</h4>
            <div className="text-green-800 dark:text-green-300 text-sm space-y-1">
              <p>✅ {saveResult.saved} new entries saved</p>
              {saveResult.duplicates > 0 && <p>⚠️ {saveResult.duplicates} duplicates skipped</p>}
              {saveResult.errors.length > 0 && <p>❌ {saveResult.errors.length} errors occurred</p>}
            </div>
            <button 
              onClick={() => setSaveResult(null)}
              className="mt-2 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        {displayMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{displayMetrics.totalRequests}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{displayMetrics.totalCost}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{displayMetrics.totalTokens}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cost/Request</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{displayMetrics.avgCostPerRequest}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Entries</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{displayMetrics.entryCount}</div>
            </div>
          </div>
        )}

        {/* Enhanced Chart */}
        {displayData.length > 0 && (
          <div ref={chartRef}>
            <EnhancedCursorCostsChart />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading enhanced data...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && displayData.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 00-2 2m0 0h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Enhanced Data Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Import your enhanced Cursor usage data with detailed token information to start tracking your AI costs and usage patterns.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        initialMode={authMode}
      />

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        stats={stats}
      />

      <CurrencySelector
        isOpen={showCurrencySelector}
        onClose={() => setShowCurrencySelector(false)}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmModalProps.onConfirm}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        confirmText={confirmModalProps.confirmText}
      />
    </div>
  )
} 