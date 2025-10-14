import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../hooks/useCurrency'
import { SUPPORTED_CURRENCIES } from '@shared'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  stats: {
    totalEntries: number
    totalRequests: number
    totalCost: number
    oldestEntry?: string
    newestEntry?: string
    rawEntries: number
    aggregatedEntries: number
  } | null
  onDeduplicate?: () => Promise<{
    totalRawEntries: number
    duplicatesRemoved: number
    uniqueEntries: number
    aggregationsRebuilt: number
    errors: string[]
  } | null>
}

export default function AccountSettingsModal({ isOpen, onClose, stats }: AccountSettingsModalProps) {
  const { currentUser, logout } = useAuth()
  const { userCurrency, updateUserCurrency, loading: currencyLoading } = useCurrency()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (!isOpen || !currentUser) return null

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      onClose()
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }



  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSignupDate = () => {
    if (currentUser.metadata?.creationTime) {
      return new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
    return 'Unknown'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gunmetal-900 text-white rounded-t-xl">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
              <img src="/logos/fueld-logo-symbol.svg" alt="Fueld" className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-white">Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* User Information */}
          <div>
            <h3 className="text-base font-semibold text-gunmetal-900 mb-3">Profile Information</h3>
            
            <div className="space-y-3">
              {/* Name & Email in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gunmetal-700 mb-1">Name</label>
                  <p className="text-sm font-medium text-gunmetal-900">
                    {currentUser.displayName || 'Not provided'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gunmetal-700 mb-1">Email</label>
                  <p className="text-sm font-medium text-gunmetal-900 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {/* Signup Date */}
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gunmetal-700 mb-1">Member Since</label>
                <p className="text-sm font-medium text-gunmetal-900">
                  {getSignupDate()}
                </p>
              </div>
            </div>
          </div>

          {/* Currency Preferences */}
          <div>
            <h3 className="text-base font-semibold text-gunmetal-900 mb-3">Currency Preferences</h3>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-xs font-medium text-gunmetal-700 mb-2">
                Preferred Currency
              </label>
              <select
                value={userCurrency}
                onChange={(e) => updateUserCurrency(e.target.value)}
                disabled={currencyLoading}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.symbol})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gunmetal-500 mt-1">
                All costs will be displayed in your preferred currency
              </p>
            </div>
          </div>

          {/* Usage Statistics */}
          <div>
            <h3 className="text-base font-semibold text-gunmetal-900 mb-3">Usage Statistics</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Raw Data Points */}
              <div className="bg-primary-50 rounded-lg p-3 border border-primary-200 text-center">
                <div className="text-xl font-bold text-gunmetal-900">
                  {stats?.rawEntries?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gunmetal-700">Raw Data Points</div>
              </div>

              {/* Aggregated Periods */}
              <div className="bg-secondary-50 rounded-lg p-3 border border-secondary-200 text-center">
                <div className="text-xl font-bold text-gunmetal-900">
                  {stats?.aggregatedEntries?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gunmetal-700">Time Periods</div>
              </div>
            </div>

            {/* Data Range */}
            {stats?.oldestEntry && stats?.newestEntry && (
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-medium text-gunmetal-700 mb-1">Data Range</label>
                <div className="text-xs text-gunmetal-900 space-y-1">
                  <div>First: {formatDate(stats.oldestEntry)}</div>
                  <div>Latest: {formatDate(stats.newestEntry)}</div>
                </div>
              </div>
            )}
          </div>


          {/* Actions */}
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-red-600 text-white border-2 border-red-600 font-semibold rounded-lg hover:bg-red-700 hover:text-white hover:text-white transition-all duration-200 shadow-md hover:shadow-lg"
            >
                             {isLoggingOut ? (
                 <span className="flex items-center justify-center">
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Signing Out...
                 </span>
               ) : (
                 <>
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                   </svg>
                   Sign Out
                 </>
               )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 