import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useTheme } from '../contexts/ThemeContext'
import { useUserUsageData } from '../hooks/useUserUsageData'
import CSVImport from '@/components/CSVImport'
import CursorUsageChart from '@/components/CursorUsageChart'
import AuthModal from '@/components/AuthModal'
import AccountSettingsModal from '@/components/AccountSettingsModal'
import CurrencySelector from '@/components/CurrencySelector'
import ConfirmationModal from '@/components/ConfirmationModal'
import ThemeToggle from '@/components/ThemeToggle'
import AdminPage from './AdminPage'
import AboutPage from './AboutPage'
import { useCurrency } from '../hooks/useCurrency'
import { CursorUsageV2, CursorUsageImportSummary } from '@shared'


export default function CursorCostsPage() {
  const navigate = useNavigate()
  const { currentUser, user } = useAuth()
  const { organization } = useOrganization()
  const { actualTheme } = useTheme()
  const { 
    loading, 
    error, 
    stats,
    deduplicateData,
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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const [currentPage, setCurrentPage] = useState<'main' | 'admin' | 'about'>('main')

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
  const isAdmin = currentUser && currentUser.email === 'glenn@fueld.ai'

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

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

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

  // Render about page if selected
  if (currentPage === 'about') {
    return <AboutPage onBackToMain={() => setCurrentPage('main')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gunmetal dark:text-gray-100 transition-colors duration-200">
      {/* Hero Section */}
      <div className="bg-secondary-800 dark:bg-gray-800 p-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2 -mt-4">
              <div className="flex flex-row items-center justify-between w-full">
                <div className="flex flex-row items-top">
                  {/* Fueld Logo Symbol - conditional based on theme */}
                  {actualTheme === 'dark' ? (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                      <img src="/logos/Logo-midnight-greeen.svg" alt="Fueld" className="w-16 h-16" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                      <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-10 h-10" />
                    </div>
                  )}
                  <div className="text-left">
                    <h1 className="text-3xl font-bold text-white">Cursor Costs Tracker</h1>
                    <p className="text-sm text-white/70 mt-1">
                      by <a href="https://go.fueld.ai/4kkKxYj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Fueld AI</a>
                    </p>
                  </div>
                </div>

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

                        <button 
                          onClick={() => openAuthModal('login')}
                          className="bg-white text-gunmetal px-6 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 dark:bg-white dark:text-black"
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
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-4">
                          <div className="flex items-center gap-4">
                            
                            {/* Account Actions */}
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <button 
                                  onClick={() => setCurrentPage('admin')}
                                  className="inline-flex items-center px-4 py-2 bg-orange-500/20 text-white rounded-lg hover:bg-orange-500/30 transition-all duration-200 backdrop-blur-sm border border-orange-400/30"
                                  title="Admin Panel"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                  Admin
                                </button>
                              )}
                              
                              <button 
                                onClick={() => setCurrentPage('about')}
                                className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
                                title="About Fueld"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                About
                              </button>
                              
                              
                              <button 
                                onClick={() => setShowAccountSettings(true)}
                                className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
                                title="Account Settings"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                              </button>

                              {/* Show Create Organization button if user doesn't have one */}
                              {user && user.tier === 'free_individual' && !organization && (
                                <button 
                                  onClick={() => navigate('/create-organization')}
                                  className="inline-flex items-center px-4 py-2 bg-primary-500 text-gunmetal-900 rounded-lg hover:bg-primary-600 transition-all duration-200 font-semibold shadow-lg"
                                  title="Create Organization"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Create Team
                                </button>
                              )}
                            
                            </div>
                          </div>

                          
                        </div>
                      </div>
                      
                    
                     
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-20 max-w-3xl mx-auto">
              <p className="text-xl text-white/90 text-center sm:text-left">
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
              <span className="text-gunmetal-900 dark:text-gray-200">
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

       

      

        {/* Enhanced Fueld Branding Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-4xl mx-auto transition-colors duration-200">
            {/* Customer Testimonials */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-6">What Our Customers Say about Fueld AI</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Quote 1 */}
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-6 border border-primary-200 dark:border-primary-800 transition-colors duration-200">
                  <div className="flex items-start space-x-2 mb-3">
                    <svg className="w-6 h-6 text-primary-500 dark:text-primary-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-gunmetal-900 dark:text-gray-200 font-medium text-lg leading-relaxed mb-3">
                        "Amazing, Love the magic you are selling"
                      </p>
                      <div className="text-right">
                        <p className="text-gunmetal-700 dark:text-gray-300 font-semibold">Stuart Crooks</p>
                        <p className="text-gunmetal-500 dark:text-gray-400 text-sm">Fintech Exec</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote 2 */}
                <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-xl p-6 border border-secondary-200 dark:border-secondary-800 transition-colors duration-200">
                  <div className="flex items-start space-x-2 mb-3">
                    <svg className="w-6 h-6 text-secondary-600 dark:text-secondary-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-gunmetal-900 dark:text-gray-200 font-medium text-lg leading-relaxed mb-3">
                        "That's just astonishing"
                      </p>
                      <div className="text-right">
                        <p className="text-gunmetal-700 dark:text-gray-300 font-semibold">James Mayes</p>
                        <p className="text-gunmetal-500 dark:text-gray-400 text-sm">Startup founder & CEO</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fueld Logo and Info */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div className="flex items-center justify-center mb-4">
                <img src={actualTheme === 'dark' ? '/logos/fueld_logo_white.svg' : '/logos/fueld-logo-full.svg'} alt="Fueld" className="h-8" />
              </div>
              
              <p className="text-sm text-gunmetal-700 dark:text-gray-300 mb-4">
                AI powered nutrition tracking, recipe generation and analytics platform
              </p>

              <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 mb-6 mt-4">
                <div className="flex items-center justify-center gap-4 text-sm">
                  <a 
                    href="https://go.fueld.ai/4kkKxYj" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-secondary-800 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400 font-medium transition-colors"
                  >
                    Visit Fueld.ai
                  </a>
                  <span className="w-1 h-1 bg-gunmetal-300 dark:bg-gray-500 rounded-full"></span>
                  <a 
                    href="http://localhost:5176/forindividuals?promoCode=Cursor1MFree" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-secondary-800 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400 font-medium transition-colors"
                  >
                    Get the App
                  </a>
                  <span className="w-1 h-1 bg-gunmetal-300 dark:bg-gray-500 rounded-full"></span>
                  <button 
                    onClick={() => setCurrentPage('about')}
                    className="text-secondary-800 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400 font-medium transition-colors"
                  >
                    About
                  </button>
                  <span className="w-1 h-1 bg-gunmetal-300 dark:bg-gray-500 rounded-full"></span>
                  <a
                    href="http://localhost:5176/forindividuals?promoCode=Cursor1MFree"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#F75C03] hover:bg-[#F75C03]/80 text-white font-semibold px-4 py-1.5 rounded-md transition-colors"
                  >
                    1 Month Free
                  </a>
                </div>

                <div className="flex flex-row items-center">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {/* Account Settings Modal */}
                <AccountSettingsModal 
            isOpen={showAccountSettings} 
            onClose={() => setShowAccountSettings(false)}
            stats={stats}
            onDeduplicate={deduplicateData}
          />

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
    </div>
  </div>
  )
} 