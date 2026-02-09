import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../hooks/useCurrency'
import { SUPPORTED_CURRENCIES } from '@shared'
import { useState, useEffect } from 'react'

interface CurrencySelectorProps {
  isOpen: boolean
  onClose: () => void
}

// Currencies that traditionally show the inverse quote (1 XXX = ? USD)
// Commonwealth currencies + Euro
const INVERSE_QUOTE_CURRENCIES = new Set(['GBP', 'EUR', 'AUD', 'NZD', 'CAD'])

export default function CurrencySelector({ isOpen, onClose }: CurrencySelectorProps) {
  const { currentUser } = useAuth()
  const { userCurrency, updateUserCurrency, currencyRates, loading } = useCurrency()
  const [searchTerm, setSearchTerm] = useState('')

  // Clear search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCurrencyChange = async (currencyCode: string) => {
    if (!currentUser) return
    
    try {
      await updateUserCurrency(currencyCode)
      onClose() // Close modal immediately after selection
    } catch (error) {
      console.error('Failed to update currency:', error)
      // Keep modal open on error so user can try again
    }
  }

  // Filter currencies based on search term
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(currency => {
    const search = searchTerm.toLowerCase()
    return (
      currency.name.toLowerCase().includes(search) ||
      currency.code.toLowerCase().includes(search) ||
      currency.symbol.toLowerCase().includes(search)
    )
  })

  // Show login prompt if user is not authenticated
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gunmetal-900 mb-2">Login Required</h3>
          <p className="text-gunmetal-700 mb-4">
            Please sign in to save your currency preference and access personalized features.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-secondary-800 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Select Currency</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1">
            Choose your preferred currency for cost display
          </p>
        </div>

        {/* Search Input */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search currencies..."
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Showing {filteredCurrencies.length} of {SUPPORTED_CURRENCIES.length} currencies
          </div>
        </div>

        {/* Currency List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-gunmetal-700">Updating currency...</p>
            </div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gunmetal-900 mb-2">No currencies found</h3>
              <p className="text-gunmetal-600 text-sm">
                Try searching for a different currency name, code, or symbol.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredCurrencies.map((currency) => {
                const rate = currencyRates[currency.code]
                const hasRate = rate && currency.code !== 'USD'
                const showInverse = INVERSE_QUOTE_CURRENCIES.has(currency.code)
                const inverseRate = hasRate ? (1 / rate.rate) : null

                return (
                  <button
                    key={currency.code}
                    onClick={() => handleCurrencyChange(currency.code)}
                    disabled={loading}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-200 border-2 ${
                      userCurrency === currency.code
                        ? 'border-primary-500 bg-primary-50 text-primary-900'
                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 text-gunmetal-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{currency.flag}</span>
                        <div>
                          <div className="font-medium text-sm">
                            {currency.name}
                          </div>
                          <div className="text-xs text-gunmetal-500">
                            {currency.code} • {currency.symbol}
                          </div>
                          {/* Exchange rate display */}
                          {hasRate && (
                            <div className="mt-1 space-y-0.5">
                              <div className="text-xs text-gunmetal-400 font-mono">
                                $1 = {currency.symbol}{rate.rate.toFixed(rate.rate < 10 ? 4 : 2)}
                              </div>
                              {showInverse && inverseRate && (
                                <div className="text-xs text-primary-500 font-mono">
                                  {currency.symbol}1 = ${inverseRate.toFixed(4)}
                                </div>
                              )}
                            </div>
                          )}
                          {currency.code === 'USD' && (
                            <div className="mt-1">
                              <div className="text-xs text-gunmetal-400 font-mono">
                                Base currency
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {userCurrency === currency.code && (
                        <div className="flex items-center text-primary-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gunmetal-500">
            Exchange rates are updated regularly. Changes apply immediately.
          </p>
        </div>
      </div>
    </div>
  )
} 