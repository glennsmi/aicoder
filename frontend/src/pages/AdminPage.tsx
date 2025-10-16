import { useState } from 'react'
import AdminCurrencyManager from '@/components/AdminCurrencyManager'
import { useAuth } from '../contexts/AuthContext'
import { adminRebuildUserAggregations, debugContentHashes } from '../lib/firestore'

interface AdminPageProps {
  onBackToMain: () => void
}

export default function AdminPage({ onBackToMain }: AdminPageProps) {
  const { currentUser } = useAuth()
  const [rebuildUserId, setRebuildUserId] = useState('')
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [rebuildResult, setRebuildResult] = useState<{
    totalRawEntries: number
    aggregationsCleared: number
    aggregationsRebuilt: number
    errors: string[]
  } | null>(null)
  const [debugUserId, setDebugUserId] = useState('')
  const [isDebugging, setIsDebugging] = useState(false)
  const [debugResult, setDebugResult] = useState<{
    totalRawEntries: number
    entriesWithHashes: number
    entriesWithoutHashes: number
    duplicateHashes: { hash: string, count: number, entries: any[] }[]
    sampleHashes: { hash: string, content: string, entry: any }[]
  } | null>(null)

  // Check if user is admin
  const isAdmin = currentUser && currentUser.email === 'glenn@aicoder.guru'

  const handleRebuildAggregations = async () => {
    if (!rebuildUserId.trim()) {
      alert('Please enter a User ID')
      return
    }

    setIsRebuilding(true)
    setRebuildResult(null)

    try {
      const result = await adminRebuildUserAggregations(rebuildUserId.trim())
      setRebuildResult(result)
      
      if (result.errors.length === 0) {
        alert(`✅ Aggregations rebuilt successfully!\n\n• Raw entries: ${result.totalRawEntries}\n• Old aggregations cleared: ${result.aggregationsCleared}\n• New aggregations created: ${result.aggregationsRebuilt}`)
      } else {
        alert(`⚠️ Rebuild completed with errors:\n\n${result.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('Error rebuilding aggregations:', error)
      alert(`❌ Error rebuilding aggregations: ${error}`)
    } finally {
      setIsRebuilding(false)
    }
  }

  const handleDebugHashes = async () => {
    if (!debugUserId.trim()) {
      alert('Please enter a User ID')
      return
    }

    setIsDebugging(true)
    setDebugResult(null)

    try {
      const result = await debugContentHashes(debugUserId.trim())
      setDebugResult(result)
      
      const totalDuplicates = result.duplicateHashes.reduce((sum, group) => sum + (group.count - 1), 0)
      alert(`🔍 Debug Analysis Complete!\n\n• Total raw entries: ${result.totalRawEntries}\n• Entries with hashes: ${result.entriesWithHashes}\n• Entries without hashes: ${result.entriesWithoutHashes}\n• Duplicate groups: ${result.duplicateHashes.length}\n• Total duplicates: ${totalDuplicates}\n\nCheck console for detailed results.`)
    } catch (error) {
      console.error('Error debugging hashes:', error)
      alert(`❌ Error debugging hashes: ${error}`)
    } finally {
      setIsDebugging(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gunmetal-900 mb-2">Access Denied</h3>
          <p className="text-gunmetal-700 mb-6">Admin privileges required to access this page.</p>
          <button
            onClick={onBackToMain}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Back to Main
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gunmetal">
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
                <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                <p className="text-sm text-white/70 mt-1">
                  System administration for <a href="https://go.fueld.ai/4kkKxYj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Fueld AI</a>
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-white backdrop-blur-sm">
                <span className="mr-2">👤</span>
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </div>
              
              <button 
                onClick={onBackToMain}
                className="inline-flex items-center px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gunmetal-900">Welcome to the Admin Panel</h2>
              <p className="text-gunmetal-700">Manage system settings and configurations for the Cursor Costs Tracker</p>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="space-y-6 mb-12">
          <div>
            <h2 className="text-2xl font-bold text-gunmetal-900 mb-2">Data Management</h2>
            <p className="text-gunmetal-700 mb-6">
              Administrative tools for managing user data and aggregations.
            </p>
          </div>
          
          {/* Aggregation Rebuild Tool */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gunmetal-900">Rebuild User Aggregations</h3>
                <p className="text-gunmetal-700 text-sm">Rebuild aggregated usage data from raw entries for any user</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-amber-800 text-sm font-medium">Important:</p>
                  <p className="text-amber-700 text-sm">
                    This will clear all existing aggregations and rebuild them from raw data. 
                    Raw data is preserved. Use this to fix aggregation issues or apply new deduplication logic.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={rebuildUserId}
                  onChange={(e) => setRebuildUserId(e.target.value)}
                  placeholder="Enter Firebase User ID (e.g., abc123xyz...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  disabled={isRebuilding}
                />
                <p className="text-xs text-gunmetal-500 mt-1">
                  Your User ID: <code className="bg-gray-100 px-1 rounded text-xs">{currentUser?.uid}</code>
                </p>
              </div>

              {rebuildResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Last Rebuild Results:</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• Raw entries processed: {rebuildResult.totalRawEntries.toLocaleString()}</div>
                    <div>• Old aggregations cleared: {rebuildResult.aggregationsCleared.toLocaleString()}</div>
                    <div>• New aggregations created: {rebuildResult.aggregationsRebuilt.toLocaleString()}</div>
                    {rebuildResult.errors.length > 0 && (
                      <div className="text-red-600">• Errors: {rebuildResult.errors.length}</div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleRebuildAggregations}
                disabled={isRebuilding || !rebuildUserId.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isRebuilding ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Rebuilding Aggregations...
                  </span>
                ) : (
                  'Rebuild Aggregations'
                )}
              </button>
            </div>
          </div>

          {/* Debug Tool */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gunmetal-900">Debug Content Hashes</h3>
                <p className="text-gunmetal-700 text-sm">Analyze content hashes and identify duplicate detection issues</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-blue-800 text-sm font-medium">Debug Tool:</p>
                  <p className="text-blue-700 text-sm">
                    This analyzes raw data to show content hashes, identify duplicates, and help diagnose deduplication issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-700 mb-2">
                  User ID to Debug
                </label>
                <input
                  type="text"
                  value={debugUserId}
                  onChange={(e) => setDebugUserId(e.target.value)}
                  placeholder="Enter Firebase User ID (e.g., abc123xyz...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={isDebugging}
                />
                <p className="text-xs text-gunmetal-500 mt-1">
                  Your User ID: <code className="bg-gray-100 px-1 rounded text-xs">{currentUser?.uid}</code>
                </p>
              </div>

              {debugResult && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Debug Results:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Total raw entries: {debugResult.totalRawEntries.toLocaleString()}</div>
                    <div>• Entries with hashes: {debugResult.entriesWithHashes.toLocaleString()}</div>
                    <div>• Entries without hashes: {debugResult.entriesWithoutHashes.toLocaleString()}</div>
                    <div>• Duplicate groups: {debugResult.duplicateHashes.length.toLocaleString()}</div>
                    <div>• Total duplicates: {debugResult.duplicateHashes.reduce((sum, group) => sum + (group.count - 1), 0).toLocaleString()}</div>
                    {debugResult.duplicateHashes.length > 0 && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-xs font-medium text-blue-800 mb-1">Top Duplicate Groups:</p>
                        {debugResult.duplicateHashes.slice(0, 3).map((group, index) => (
                          <div key={index} className="text-xs text-blue-600">
                            • Hash {group.hash.substring(0, 8)}... has {group.count} copies
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleDebugHashes}
                disabled={isDebugging || !debugUserId.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isDebugging ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Hashes...
                  </span>
                ) : (
                  'Debug Content Hashes'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Currency Management Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gunmetal-900 mb-2">Currency Management</h2>
            <p className="text-gunmetal-700 mb-6">
              Configure exchange rates and manage supported currencies for all users. Changes take effect immediately.
            </p>
          </div>
          
          <AdminCurrencyManager />
        </div>

        {/* Future Admin Sections */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gunmetal-900">User Analytics</h3>
            </div>
            <p className="text-gunmetal-700 text-sm mb-4">
              View user engagement metrics and usage statistics across the platform.
            </p>
            <div className="text-xs text-gunmetal-500 bg-gray-50 rounded p-3">
              Coming soon - User dashboard analytics
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gunmetal-900">System Settings</h3>
            </div>
            <p className="text-gunmetal-700 text-sm mb-4">
              Configure application settings, maintenance mode, and system preferences.
            </p>
            <div className="text-xs text-gunmetal-500 bg-gray-50 rounded p-3">
              Coming soon - System configuration panel
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 